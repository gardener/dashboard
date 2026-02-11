//
// SPDX-FileCopyrightText: 2023 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

import {
  canI,
  machineImageHasUpdateForAutoUpdateStrategy,
  machineImageHasUpdate,
  isHtmlColorCode,
  defaultCriNameByKubernetesVersion,
  getIssueSince,
  maintenanceWindowWithBeginAndTimezone,
  getDurationInMinutes,
  getTimeStringTo,
  getTimeStringFrom,
  parseNumberWithMagnitudeSuffix,
  normalizeVersion,
  isEmail,
  convertToGi,
  convertToGibibyte,
} from '@/utils'

import pick from 'lodash/pick'
import find from 'lodash/find'

describe('utils', () => {
  describe('authorization', () => {
    describe('#canI', () => {
      let rulesReview

      beforeEach(() => {
        rulesReview = {
          resourceRules: [{
            verbs: ['get'],
            apiGroups: ['group1'],
            resources: ['resource1'],
          },
          {
            verbs: ['get'],
            apiGroups: ['group2'],
            resources: ['resource2'],
            resourceNames: [
              'resourceName2',
            ],
          },
          {
            verbs: ['get'],
            apiGroups: ['group3'],
            resources: ['resource3'],
          },
          {
            verbs: ['get'],
            apiGroups: ['group3'],
            resources: ['resource3'],
            resourceNames: [
              'resourceName3',
              'resourceName4',
            ],
          }],
        }
      })

      it('should validate', () => {
        expect(canI(rulesReview, 'get', 'group1', 'resource1')).toBe(true)
        expect(canI(rulesReview, 'get', 'group1', 'resource1', 'anyResourceName')).toBe(true)

        expect(canI(rulesReview, 'foo', 'group1', 'resource1')).toBe(false)
        expect(canI(rulesReview, 'get', 'foo', 'resource1')).toBe(false)
        expect(canI(rulesReview, 'get', 'group1', 'foo')).toBe(false)
        expect(canI(rulesReview, 'get', 'group1', 'resource3')).toBe(false)
        expect(canI(rulesReview, 'foo', 'bar', 'baz')).toBe(false)
      })

      it('should validate for resourceName', () => {
        expect(canI(rulesReview, 'get', 'group2', 'resource2', 'resourceName2')).toBe(true)
        expect(canI(rulesReview, 'get', 'group3', 'resource3')).toBe(true)
        expect(canI(rulesReview, 'get', 'group3', 'resource3', 'resourceName3')).toBe(true)
        expect(canI(rulesReview, 'get', 'group3', 'resource3', 'resourceName4')).toBe(true)
        expect(canI(rulesReview, 'get', 'group3', 'resource3', 'anyResourceName')).toBe(true)

        expect(canI(rulesReview, 'get', 'group2', 'resource2')).toBe(false)
        expect(canI(rulesReview, 'get', 'group2', 'resource2', 'foo')).toBe(false)
        expect(canI(rulesReview, 'foo', 'group2', 'resource2', 'resourceName2')).toBe(false)
        expect(canI(rulesReview, 'get', 'foo', 'resource2', 'resourceName2')).toBe(false)
        expect(canI(rulesReview, 'get', 'group2', 'foo', 'resourceName2')).toBe(false)
        expect(canI(rulesReview, 'foo', 'bar', 'baz', 'resourceName2')).toBe(false)
      })

      it('should validate with wildcard verb', () => {
        rulesReview = {
          resourceRules: [{
            verbs: ['*'],
            apiGroups: ['group4'],
            resources: ['resource4'],
          }],
        }
        expect(canI(rulesReview, 'get', 'group4', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'list', 'group4', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'foo', 'group4', 'resource4')).toBe(true)
        expect(canI(rulesReview, '*', 'group4', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'get', 'group4', 'resource4', 'anyResourceName')).toBe(true)

        expect(canI(rulesReview, 'get', 'foo', 'resource4')).toBe(false)
        expect(canI(rulesReview, 'get', 'group4', 'foo')).toBe(false)
      })

      it('should validate with wildcard apiGroup', () => {
        rulesReview = {
          resourceRules: [{
            verbs: ['get'],
            apiGroups: ['*'],
            resources: ['resource4'],
          }],
        }
        expect(canI(rulesReview, 'get', 'group4', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'get', 'foo', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'get', '*', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'get', 'group4', 'resource4', 'anyResourceName')).toBe(true)

        expect(canI(rulesReview, 'foo', 'group4', 'resource4')).toBe(false)
        expect(canI(rulesReview, 'get', 'group4', 'foo')).toBe(false)
      })

      it('should validate with wildcard resource', () => {
        rulesReview = {
          resourceRules: [{
            verbs: ['get'],
            apiGroups: ['group4'],
            resources: ['*'],
          }],
        }
        expect(canI(rulesReview, 'get', 'group4', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'get', 'group4', 'foo')).toBe(true)
        expect(canI(rulesReview, 'get', 'group4', '*')).toBe(true)
        expect(canI(rulesReview, 'get', 'group4', 'resource4', 'anyResourceName')).toBe(true)

        expect(canI(rulesReview, 'foo', 'group4', 'resource4')).toBe(false)
        expect(canI(rulesReview, 'get', 'foo', 'resource4')).toBe(false)
      })

      it('should validate with wildcard resource name', () => {
        rulesReview = {
          resourceRules: [{
            verbs: ['get'],
            apiGroups: ['group4'],
            resources: ['resource4'],
            resourceName: ['*'],
          }],
        }
        expect(canI(rulesReview, 'get', 'group4', 'resource4')).toBe(true)
        expect(canI(rulesReview, 'get', 'group4', 'resource4', 'anyResourceName')).toBe(true)

        expect(canI(rulesReview, 'foo', 'group4', 'resource4')).toBe(false)
        expect(canI(rulesReview, 'get', 'foo', 'resource4')).toBe(false)
        expect(canI(rulesReview, 'get', 'group4', 'foo')).toBe(false)
      })

      it('should not fail to validate rulesReview', () => {
        expect(canI(undefined, 'get', 'group1', 'resource1')).toBe(false)
        expect(canI({}, 'get', 'group1', 'resource1')).toBe(false)
        expect(canI({ resourceRules: [] }, 'get', 'group1', 'resource1')).toBe(false)
        expect(canI({
          resourceRules: [{
            verbs: [],
            apiGroups: [],
            resources: [],
          }],
        }, 'get', 'group1', 'resource1')).toBe(false)
      })
    })
  })

  describe('defaultCriNameByKubernetesVersion', () => {
    it('should return docker for k8s < 1.22.0', () => {
      expect(defaultCriNameByKubernetesVersion(['cri1', 'docker', 'containerd', 'cri2'], '1.21.3')).toBe('docker')
    })

    it('should return containerd for k8s >= 1.22.0', () => {
      expect(defaultCriNameByKubernetesVersion(['cri1', 'docker', 'containerd', 'cri2'], '1.22.0')).toBe('containerd')
    })

    it('should return first cri as fallback', () => {
      expect(defaultCriNameByKubernetesVersion(['cri1', 'cri2'], '1.21.3')).toBe('cri1')
      expect(defaultCriNameByKubernetesVersion(['cri1', 'cri2'], '1.22.0')).toBe('cri1')
    })
  })

  describe('#machineImageHasUpdateForAutoUpdateStrategy', () => {
    const sampleMachineImages = [
      {
        vendorName: 'Foo',
        version: '1.1.1',
        isSupported: true,
      },
      {
        vendorName: 'Foo',
        version: '1.1.2',
        isSupported: true,
      },
      {
        vendorName: 'Foo',
        version: '1.1.3',
        isSupported: false,
      },
      {
        vendorName: 'Foo',
        version: '1.2.0',
        isSupported: true,
      },
      {
        vendorName: 'Foo',
        version: '2.0.0',
        isSupported: true,
      },
      {
        vendorName: 'Bar', // Ensures other vendors are not considered for update
        version: '1.1.5',
        isSupported: true,
      },
    ]

    function createMachineImage (version, updateStrategy) {
      return {
        ...find(sampleMachineImages, ['version', version]),
        updateStrategy,
      }
    }

    it('image should have update (updateStrategy major | patch, minor, major exist)', () => {
      const maschineImage = createMachineImage('1.1.1', 'major')
      const result = machineImageHasUpdateForAutoUpdateStrategy(maschineImage, sampleMachineImages)
      expect(result).toBe(true)
    })

    it('image should have update (updateStrategy minor | patch, minor, major exist)', () => {
      const maschineImage = createMachineImage('1.1.1', 'minor')
      const result = machineImageHasUpdateForAutoUpdateStrategy(maschineImage, sampleMachineImages)
      expect(result).toBe(true)
    })

    it('image should have update (updateStrategy patch | patch, minor, major exist)', () => {
      const maschineImage = createMachineImage('1.1.1', 'patch')
      const result = machineImageHasUpdateForAutoUpdateStrategy(maschineImage, sampleMachineImages)
      expect(result).toBe(true)
    })

    it('image should have update (updateStrategy major | minor, major exist)', () => {
      const maschineImage = createMachineImage('1.1.2', 'major')
      const result = machineImageHasUpdateForAutoUpdateStrategy(maschineImage, sampleMachineImages)
      expect(result).toBe(true)
    })

    it('image should have update (updateStrategy minor | minor, major exist)', () => {
      const maschineImage = createMachineImage('1.1.2', 'minor')
      const result = machineImageHasUpdateForAutoUpdateStrategy(maschineImage, sampleMachineImages)
      expect(result).toBe(true)
    })

    it('image should not have update (updateStrategy patch | minor, major exist)', () => {
      const maschineImage = createMachineImage('1.1.2', 'patch')
      const result = machineImageHasUpdateForAutoUpdateStrategy(maschineImage, sampleMachineImages)
      expect(result).toBe(false)
    })

    it('image should have update (updateStrategy major | major exists)', () => {
      const maschineImage = createMachineImage('1.2.0', 'major')
      const result = machineImageHasUpdateForAutoUpdateStrategy(maschineImage, sampleMachineImages)
      expect(result).toBe(true)
    })

    it('image should not have update (updateStrategy minor | major exists)', () => {
      const maschineImage = createMachineImage('1.2.0', 'minor')
      let result = machineImageHasUpdateForAutoUpdateStrategy(maschineImage, sampleMachineImages)
      expect(result).toBe(false)
      result = machineImageHasUpdate(maschineImage, sampleMachineImages)
      expect(result).toBe(true)
    })

    it('image should not have update (updateStrategy major | none exists)', () => {
      const maschineImage = createMachineImage('2.0.0', 'major')
      let result = machineImageHasUpdateForAutoUpdateStrategy(maschineImage, sampleMachineImages)
      expect(result).toBe(false)
      result = machineImageHasUpdate(maschineImage, sampleMachineImages)
      expect(result).toBe(false)
    })

    it('image should have update (updateStrategy unknown defaults to major | major exists)', () => {
      const maschineImage = createMachineImage('1.2.0', 'foo')
      const result = machineImageHasUpdateForAutoUpdateStrategy(maschineImage, sampleMachineImages)
      expect(result).toBe(true)
    })
  })

  describe('html color code', () => {
    it('should not fail when zero', () => {
      expect(isHtmlColorCode(undefined)).toBe(false)
      expect(isHtmlColorCode(null)).toBe(false)
    })

    it('should return true on html color code', () => {
      expect(isHtmlColorCode('#0b8062')).toBe(true)
      expect(isHtmlColorCode('#FfFfFf')).toBe(true)
    })

    it('should return false on non-html color code', () => {
      expect(isHtmlColorCode('foo')).toBe(false)
    })
  })

  describe('getIssueSince', () => {
    let status

    beforeEach(() => {
      status = {
        lastOperation: {
          state: 'False',
          lastUpdateTime: '2000-01-01T00:00:01Z',
        },
        conditions: [
          {
            status: 'True',
            lastTransitionTime: '2000-01-01T00:00:02Z',
          },
          {
            status: 'False',
            lastTransitionTime: '2000-01-01T00:00:03Z',
          },
          {
            status: 'False',
            lastTransitionTime: '2000-01-01T00:00:04Z',
          },
        ],
        constraints: [
          {
            status: 'True',
            lastTransitionTime: '2000-01-01T00:00:05Z',
          },
          {
            status: 'False',
            lastTransitionTime: '2000-01-01T00:00:06Z',
          },
          {
            status: 'False',
            lastTransitionTime: '2000-01-01T00:00:07Z',
          },
        ],
        lastErrors: [
          {
            lastUpdateTime: '2000-01-01T00:00:08Z',
          },
        ],
      }
    })

    it('should not fail when zero', () => {
      expect(getIssueSince()).toBeUndefined()
    })

    it('should return undefined for lastOperation == true', () => {
      status.lastOperation.state = 'True'
      expect(getIssueSince(pick(status, 'lastOperation'))).toBeUndefined()
    })

    it('should return issue since for lastOperation', () => {
      expect(getIssueSince(pick(status, 'lastOperation'))).toBe('2000-01-01T00:00:01Z')
    })

    it('should return issue since for condition', () => {
      expect(getIssueSince(pick(status, 'conditions'))).toBe('2000-01-01T00:00:03Z')
    })

    it('should return issue since for constraint', () => {
      expect(getIssueSince(pick(status, 'constraints'))).toBe('2000-01-01T00:00:06Z')
    })

    it('should return issue since for lastError', () => {
      expect(getIssueSince(pick(status, 'lastErrors'))).toBe('2000-01-01T00:00:08Z')
    })

    it('should return issue since for allIssues', () => {
      expect(getIssueSince(status)).toBe('2000-01-01T00:00:01Z')
    })
  })
  describe('maintenanceWindowWithBeginAndTimezone', () => {
    it('should create window with default window size', () => {
      expect(maintenanceWindowWithBeginAndTimezone('22:00', '+02:00')).toEqual({
        begin: '220000+0200',
        end: '230000+0200',
      })
    })

    it('should create window with provided window size', () => {
      expect(maintenanceWindowWithBeginAndTimezone('22:00', '+02:00', 120)).toEqual({
        begin: '220000+0200',
        end: '000000+0200',
      })
    })

    it('should create window with provided window size across multiple days', () => {
      expect(maintenanceWindowWithBeginAndTimezone('22:00', '+02:00', 180)).toEqual({
        begin: '220000+0200',
        end: '010000+0200',
      })
    })
  })
  describe('getDurationInMinutes', () => {
    it('should calculate window size', () => {
      expect(getDurationInMinutes('22:00', '23:00')).toBe(60)
    })
    it('should calculate window size across multiple days', () => {
      expect(getDurationInMinutes('23:00', '01:00')).toBe(120)
    })
  })

  describe('getTimeStringTo', () => {
    it('should calculate the relative time to a future date', () => {
      const time = Date.now()
      expect(getTimeStringTo(time, time)).toBe('just now')
      expect(getTimeStringTo(time, time, true)).toBe('just now')
      expect(getTimeStringTo(time, time + 7 * 1_000, true)).toBe('7 seconds')
      expect(getTimeStringTo(time, time + 7 * 1_000)).toBe('in 7 seconds')
      expect(getTimeStringTo(time, time + 70 * 24 * 3600_000, true)).toBe('2 months')
      expect(getTimeStringTo(time, time + 70 * 24 * 3600_000)).toBe('in 2 months')
    })
  })

  describe('getTimeStringFrom', () => {
    it('should calculate the relative time to a date in the past', () => {
      const time = Date.now()
      expect(getTimeStringFrom(time, time)).toBe('just now')
      expect(getTimeStringFrom(time, time, true)).toBe('just now')
      expect(getTimeStringFrom(time, time + 7 * 1_000, true)).toBe('7 seconds')
      expect(getTimeStringFrom(time, time + 7 * 1_000)).toBe('7 seconds ago')
      expect(getTimeStringFrom(time, time + 70 * 24 * 3600_000, true)).toBe('2 months')
      expect(getTimeStringFrom(time, time + 70 * 24 * 3600_000)).toBe('2 months ago')
    })
  })

  describe('parseNumberWithMagnitudeSuffix', () => {
    it('should convert k to thousands', () => {
      expect(parseNumberWithMagnitudeSuffix('1k')).toBe(1000)
      expect(parseNumberWithMagnitudeSuffix('1K')).toBe(1000)
    })

    it('should convert M to millions', () => {
      expect(parseNumberWithMagnitudeSuffix('1M')).toBe(1000000)
      expect(parseNumberWithMagnitudeSuffix('1m')).toBe(1000000)
    })

    it('should convert B to billions', () => {
      expect(parseNumberWithMagnitudeSuffix('1B')).toBe(1000000000)
      expect(parseNumberWithMagnitudeSuffix('1b')).toBe(1000000000)
    })

    it('should convert T to trillions', () => {
      expect(parseNumberWithMagnitudeSuffix('1T')).toBe(1000000000000)
      expect(parseNumberWithMagnitudeSuffix('1t')).toBe(1000000000000)
    })

    it('should handle decimal values correctly', () => {
      expect(parseNumberWithMagnitudeSuffix('1.5k')).toBe(1500)
      expect(parseNumberWithMagnitudeSuffix('2.5M')).toBe(2500000)
    })

    it('should return the original number if no suffix', () => {
      expect(parseNumberWithMagnitudeSuffix('500')).toBe(500)
    })

    test('returns null for invalid input', () => {
      expect(parseNumberWithMagnitudeSuffix('x1')).toBeNull()
    })

    test('returns null for invalid suffix', () => {
      expect(parseNumberWithMagnitudeSuffix('1x')).toBeNull()
    })
  })

  describe('isEmail', () => {
    it('should return true for valid emails', () => {
      expect(isEmail('a@b.de')).toBe(true)
      expect(isEmail('a@b.a.r.com')).toBe(true)
      expect(isEmail('abcdefghijklmnopqrstuvwxyz0123456789.!#$%&’*+/=?^_`{|}~-@bar.com')).toBe(true)
    })

    it('should return false for valid emails', () => {
      expect(isEmail(undefined)).toBe(false)
      expect(isEmail('')).toBe(false)
      expect(isEmail('a'.repeat(321))).toBe(false)
      expect(isEmail('bar.com')).toBe(false)
      expect(isEmail('a@b@bar.com')).toBe(false)
      expect(isEmail('a@b@bar.com')).toBe(false)
      expect(isEmail('@bar.com')).toBe(false)
      expect(isEmail('a@bar')).toBe(false)
      expect(isEmail('<a>@bar.com')).toBe(false)
      expect(isEmail('a@bar.c')).toBe(false)
      expect(isEmail('a@bar..com')).toBe(false)
      expect(isEmail('abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789@bar.com')).toBe(false)
    })
  })

  describe('normalizeVersion', () => {
    it('should fill missing segments', () => {
      expect(normalizeVersion('1.12')).toBe('1.12.0')
      expect(normalizeVersion('2')).toBe('2.0.0')
    })

    it('should cut additional segments', () => {
      expect(normalizeVersion('1.2.23.4')).toBe('1.2.23')
    })

    it('should preserve pre-release or build suffix', () => {
      expect(normalizeVersion('1.2-beta')).toBe('1.2.0-beta')
      expect(normalizeVersion('1.2.14.3+abcd')).toBe('1.2.14+abcd')
    })

    it('should remove leading zeros', () => {
      expect(normalizeVersion('23.05')).toBe('23.5.0')
    })

    it('should allow only integer segments', () => {
      expect(normalizeVersion('23.1e1')).toBeUndefined()
      expect(normalizeVersion('23.x')).toBeUndefined()
    })

    it('should not allow pre or suffix other than allowed ones', () => {
      expect(normalizeVersion('x23.1')).toBeUndefined()
      expect(normalizeVersion('23.2x')).toBeUndefined()
    })
  })

  describe('convertToGi', () => {
    const precision = 9
    it('should convert binary units to Gibibyte', () => {
      expect(convertToGi('1Ki')).toBe(Math.pow(1024, -2))
      expect(convertToGi('1Mi')).toBe(Math.pow(1024, -1))
      expect(convertToGi('1Gi')).toBe(Math.pow(1024, 0))
      expect(convertToGi('1Ti')).toBe(Math.pow(1024, 1))
      expect(convertToGi('1Pi')).toBe(Math.pow(1024, 2))
    })

    it('should convert decimal units to Gibibyte', () => {
      expect(convertToGi('1')).toBeCloseTo(Math.pow(1000, 3) * Math.pow(1024, -6), precision)
      expect(convertToGi('1K')).toBeCloseTo(Math.pow(1000, 3) * Math.pow(1024, -5), precision)
      expect(convertToGi('1M')).toBeCloseTo(Math.pow(1000, 3) * Math.pow(1024, -4), precision)
      expect(convertToGi('1G')).toBeCloseTo(Math.pow(1000, 3) * Math.pow(1024, -3), precision)
      expect(convertToGi('1T')).toBeCloseTo(Math.pow(1000, 3) * Math.pow(1024, -2), precision)
      expect(convertToGi('1P')).toBeCloseTo(Math.pow(1000, 3) * Math.pow(1024, -1), precision)
    })

    it('should convert floats to Gibibyte', () => {
      expect(convertToGi('1.23Gi')).toBe(1.23)
      expect(convertToGi('4.56Ti')).toBe(4.56 * Math.pow(1024, 1))
      expect(convertToGi('7.89G')).toBeCloseTo(7.89 * Math.pow(1000, 3) * Math.pow(1024, -3), precision)
    })

    it('should fail to convert to Gibibyte', () => {
      expect(() => convertToGibibyte('1.2.3')).toThrow(TypeError)
      expect(() => convertToGibibyte('1Xi')).toThrow(TypeError)
      expect(() => convertToGibibyte('1E3')).toThrow(TypeError)
      expect(() => convertToGibibyte('1,23')).toThrow(TypeError)
      expect(() => convertToGibibyte('Gi')).toThrow(TypeError)
    })
  })
})
