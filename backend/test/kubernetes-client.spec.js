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

'use strict'

const mixins = require('../lib/kubernetes-client/mixins')
const { V1, V1Alpha1, V1Beta1, CoreGroup, NamedGroup, NamespaceScoped, ClusterScoped, Readable } = mixins

describe('kubernetes-client', function () {
  /* eslint no-unused-expressions: 0 */

  describe('mixins', function () {
    it('should check that plain mixins do not occur in the inheritance hierarchy', function () {
      class V1Object extends V1(Object) {}
      expect(new V1Object()).to.have.nested.property('constructor.version', 'v1')
      expect(() => new V1Object() instanceof V1).to.throw(TypeError)

      class V1Alpha1Object extends V1Alpha1(Object) {}
      expect(new V1Alpha1Object()).to.have.nested.property('constructor.version', 'v1alpha1')
      expect(() => new V1Alpha1Object() instanceof V1Alpha1).to.throw(TypeError)

      class V1Beta1Object extends V1Beta1(Object) {}
      expect(new V1Beta1Object()).to.have.nested.property('constructor.version', 'v1beta1')
      expect(() => new V1Beta1Object() instanceof V1Beta1).to.throw(TypeError)

      class CoreGroupObject extends CoreGroup(Object) {}
      expect(() => new CoreGroupObject() instanceof CoreGroup).to.throw(TypeError)

      class NamedGroupObject extends NamedGroup(Object) {}
      expect(() => new NamedGroupObject() instanceof NamedGroup).to.throw(TypeError)
    })

    it('should check that declared mixins do occur in the inheritance hierarchy', function () {
      class ClusterScopedObject extends ClusterScoped(Object) {}
      expect(new ClusterScopedObject()).to.be.an.instanceof(ClusterScoped)

      class NamespaceScopedObject extends NamespaceScoped(Object) {}
      expect(new NamespaceScopedObject()).to.be.an.instanceof(NamespaceScoped)

      class ReadableNamespaceScopedObject extends Readable(NamespaceScopedObject) {}
      expect(new ReadableNamespaceScopedObject()).to.be.an.instanceof(Readable)

      class ReadableClusterScopedObject extends Readable(ClusterScopedObject) {}
      expect(new ReadableClusterScopedObject()).to.be.an.instanceof(Readable)
    })
  })
})
