import createError from 'http-errors'
import cache from '../cache/index.js'
import * as authorization from '../services/authorization.js'
import helper from './helper.js'
import { projectFilter } from '../utils/index.js'

function joinRoom(socket, projectName) {
  return socket.join(`issues;${projectName}`)
}

export async function subscribe(socket, { namespace } = {}) {
  const user = helper.getUserFromSocket(socket)
  const canListProjects = await authorization.canListProjects(user)

  if (namespace === '_all') {
    const projects = cache.getProjects().filter(projectFilter(user, canListProjects))
    await Promise.all(projects.map(project => joinRoom(socket, project.metadata.name)))
    return
  }

  const project = cache.findProjectByNamespace(namespace)
  if (!projectFilter(user, canListProjects)(project)) {
    throw createError(403, 'Insufficient authorization for ticket subscription')
  }
  await joinRoom(socket, project.metadata.name)
}

export async function unsubscribe(socket) {
  const rooms = [...socket.rooms].filter(room => room.startsWith('issues;'))
  await Promise.all(rooms.map(room => socket.leave(room)))
}
