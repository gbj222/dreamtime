/*
 * DreamTime.
 * Copyright (C) 2019. Ivan Bravo Bravo <ivan@dreamnet.tech>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License 3.0 as published by
 * the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * Author: Ivan Bravo Bravo (ivan@dreamnet.tech)
 * File Created: 23rd July 2019 3:10:35 pm
 * Last Modified: 29th July 2019 10:12:27 pm
 * Modified By: Ivan Bravo Bravo (ivan@dreamnet.tech>)
 */

const { app, BrowserWindow } = require('electron')
const http = require('http')
const path = require('path')
const fs = require('fs')
const debug = require('debug').default('app:electron')
const { getRootPath, pack } = require('electron-utils')
const { settings, nucleus, rollbar } = require('./modules')

const config = require('../nuxt.config')

// We indicate to NuxtJS the root directory of the project
config.rootDir = path.dirname(__dirname)

// Copyright.
// DO NOT DELETE OR ALTER THIS SECTION!
console.log(`
    DreamTime.
    Copyright (C) 2019. Ivan Bravo Bravo <ivan@dreamnet.tech>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License 3.0 as published by
    the Free Software Foundation.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
`)

// debug
debug('Starting...')

debug({
  env: process.env.NODE_ENV,
  root: getRootPath(),
  isStatic: pack.isStatic()
})

class DreamApp {
  /**
   * Start the magic!
   */
  static async start() {
    await this.setup()

    this.createWindow()
  }

  /**
   * Prepare the application for use
   */
  static async setup() {
    settings.init()

    await nucleus.init()

    rollbar.init()

    this.createModelsDir()
  }

  /**
   * Create the program window and load the interface
   */
  static createWindow() {
    // Create the browser window.
    this.window = new BrowserWindow({
      width: 1200,
      height: 700,
      minWidth: 1200,
      minHeight: 700,
      webPreferences: {
        // This script offers us the necessary tools to communicate with the operating system.
        // (filesystem, start processes, etc).
        preload: path.join(app.getAppPath(), 'electron', 'preload.js')
      }
    })

    // Disable the default Electron menu
    this.window.setMenu(null)

    // Get the interface location
    this.loadURL = this.getNuxtAppLocation()

    if (config.dev) {
      // We are in development,
      // we load the DevTools and wait for the NuxtJS server to load.
      this.window.webContents.openDevTools()
      this.pollServer()
    } else {
      // We are in production, only load the interface!
      this.window.loadFile(this.loadURL)
    }
  }

  /**
   * Wait until the NuxtJS server is ready.
   */
  static pollServer() {
    debug(`Requesting status from the server: ${this.loadURL}`)

    const response = http
      .get(this.loadURL, response => {
        if (response.statusCode === 200) {
          debug('> Server ready, show time!')
          this.window.loadURL(this.loadURL)
        } else {
          debug(`> The server reported the status code: ${response.statusCode}`)
          setTimeout(this.pollServer.bind(this), 300)
        }
      })
      .on('error', error => {
        setTimeout(this.pollServer.bind(this), 300)
      })
  }

  /**
   * Returns the location of the interface
   */
  static getNuxtAppLocation() {
    if (!config.dev) {
      return path.join(config.rootDir, 'dist', 'index.html')
    }

    return `http://localhost:${config.server.port}`
  }

  /**
   * Create the model folder to save the processed photos
   */
  static createModelsDir() {
    const modelsPath = path.join(
      app.getPath('userData'),
      'models',
      'Uncategorized'
    )

    if (!fs.existsSync(modelsPath)) {
      fs.mkdirSync(
        modelsPath,
        {
          recursive: true
        },
        error => {
          throw new Error(
            `An error occurred trying to create the directory to save the models,
          please make sure that the application has permissions to create the directory:\n
          ${modelsPath}`
          )
        }
      )
    }
  }
}

app.on('ready', () => {
  try {
    DreamApp.start()
  } catch (error) {
    console.error(error)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  app.quit()
})

// app.on('activate', () => win === null && newWin())
