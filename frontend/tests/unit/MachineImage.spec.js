//
// Copyright (c) 2019 by SAP SE or an SAP affiliate company. All rights reserved. This file is licensed under the Apache Software License, v. 2 except as noted otherwise in the LICENSE file
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { expect } from 'chai'
import { shallowMount } from '@vue/test-utils'
import MachineImage from '@/components/ShootWorkers/MachineImage.vue'
import Vue from 'vue'
import Vuetify from 'vuetify'
import Vuelidate from 'vuelidate'

Vue.use(Vuetify)
Vue.use(Vuelidate)

const sampleMachineImages = [
  {
    name: 'FooImage',
    vendorName: 'Foo',
    icon: 'icon',
    version: '1.1.1'
  },
  {
    name: 'FooImage2',
    vendorName: 'Foo',
    icon: 'icon',
    version: '1.2.2'
  },
  {
    name: 'FooImage3',
    vendorName: 'Foo',
    icon: 'icon',
    version: '1.3.2'
  },
  {
    name: 'BarImage',
    vendorName: 'Bar',
    icon: 'icon',
    version: '3.3.2'
  }
]

function createMachineImageComponent (selectedMachineImage) {
  const propsData = {
    machineImages: sampleMachineImages,
    worker: {
      machine: {
        image: selectedMachineImage
      }
    }
  }
  const wrapper = shallowMount(MachineImage, {
    propsData
  })
  const machineImageComponent = wrapper.find(MachineImage)

  return machineImageComponent.vm
}

describe('MachineImage.vue', function () {
  it('selected image should be latest (multiple exist)', function () {
    const machineImage = createMachineImageComponent(sampleMachineImages[2])
    expect(machineImage.selectedImageIsNotLatest).to.be.false
  })

  it('selected image should be latest (one exists)', function () {
    const machineImage = createMachineImageComponent(sampleMachineImages[3])
    expect(machineImage.selectedImageIsNotLatest).to.be.false
  })

  it('selected image should not be latest', function () {
    const machineImage = createMachineImageComponent(sampleMachineImages[1])
    expect(machineImage.selectedImageIsNotLatest).to.be.true
  })
})
