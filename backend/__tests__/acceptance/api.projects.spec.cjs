//
// SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Gardener contributors
//
// SPDX-License-Identifier: Apache-2.0
//

'use strict'

jest.mock('../../dist/lib/services/projects')

const express = require('express')
const supertest = require('supertest')
const projects = require('../../dist/lib/services/projects')
const routes = require('../../dist/lib/routes/projects')

const app = express()
app.use(express.json())
app.use('/api/projects', routes)

describe('API Projects', () => {
  const user = { id: 'test-user', client: { 'core.gardener.cloud': { projects: {} } } }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/projects', () => {
    it('should return a list of projects', async () => {
      const projectList = [{ metadata: { name: 'foo' } }, { metadata: { name: 'bar' } }]
      projects.list.mockResolvedValue(projectList)

      const res = await supertest(app)
        .get('/api/projects')
        .set('user', JSON.stringify(user))
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res.body).toEqual(projectList)
    })
  })

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const body = { metadata: { name: 'foo' } }
      const project = { metadata: { name: 'foo' }, status: { phase: 'Ready' } }
      projects.create.mockResolvedValue(project)

      const res = await supertest(app)
        .post('/api/projects')
        .send(body)
        .set('user', JSON.stringify(user))
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res.body).toEqual(project)
    })
  })

  describe('GET /api/projects/:project', () => {
    it('should return a project by name', async () => {
      const project = { metadata: { name: 'foo' } }
      projects.read.mockResolvedValue(project)

      const res = await supertest(app)
        .get('/api/projects/foo')
        .set('user', JSON.stringify(user))
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res.body).toEqual(project)
    })
  })

  describe('PUT /api/projects/:project', () => {
    it('should update a project', async () => {
      const body = { metadata: { name: 'foo' } }
      const project = { metadata: { name: 'foo' } }
      projects.patch.mockResolvedValue(project)

      const res = await supertest(app)
        .put('/api/projects/foo')
        .send(body)
        .set('user', JSON.stringify(user))
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res.body).toEqual(project)
    })
  })

  describe('PATCH /api/projects/:project', () => {
    it('should patch a project', async () => {
      const body = { metadata: { name: 'foo' } }
      const project = { metadata: { name: 'foo' } }
      projects.patch.mockResolvedValue(project)

      const res = await supertest(app)
        .patch('/api/projects/foo')
        .send(body)
        .set('user', JSON.stringify(user))
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res.body).toEqual(project)
    })
  })

  describe('DELETE /api/projects/:project', () => {
    it('should delete a project', async () => {
      const project = { metadata: { name: 'foo' } }
      projects.remove.mockResolvedValue(project)

      const res = await supertest(app)
        .delete('/api/projects/foo')
        .set('user', JSON.stringify(user))
        .expect('Content-Type', /json/)
        .expect(200)

      expect(res.body).toEqual(project)
    })
  })
})
