'use strict'

const { getReactConfig } = require('./react')
const { getVueConfig } = require('./vue')
const { getHtmlConfig } = require('./html')

const SUPPORTED_PROJECT_TYPES = ['react', 'vue', 'html']

function getConfigForProjectType(projectType) {
  switch (projectType.toLowerCase().trim()) {
    case 'react':
      return getReactConfig()
    case 'vue':
      return getVueConfig()
    case 'html':
      return getHtmlConfig()
    default:
      throw new Error(
        `Unsupported project-type: "${projectType}". Must be one of: ${SUPPORTED_PROJECT_TYPES.join(', ')}`
      )
  }
}

module.exports = { getConfigForProjectType, SUPPORTED_PROJECT_TYPES }
