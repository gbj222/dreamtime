import randomstring from 'randomstring'
import moment from 'moment'
import File from '../file'
import Timer from '../timer'

const debug = require('debug').default('app:modules:models:photo-job')

export default class PhotoJob {
  constructor(id, photo) {
    this.id = id
    this.photo = photo

    // Output file, this is the photo already transformed!
    this.file = File.fromPath(photo.getFolderPath(this.getOutputFileName()))

    // CLI messages
    this.cliLines = []
    this.cliError = ''

    this.cli = {
      lines: [],
      error: ''
    }

    this.timer = new Timer()

    this.debug(`New Photo-Job instance`, {
      id: this.id,
      photo: this.photo,
      file: this.file
    })
  }

  /**
   *
   * @param {*} message
   * @param  {...any} args
   */
  debug(message, ...args) {
    debug(`[${this.photo.uuid}][${this.id}] ${message} `, ...args)
  }

  getId() {
    return this.id
  }

  getPhoto() {
    return this.photo
  }

  /**
   *
   */
  getOutputFileName() {
    const rand = randomstring.generate({
      length: 3,
      charset: 'numeric'
    })

    return `${this.photo.getSourceFile().getName()}-${
      this.id
    }-${rand}-dreamtime.png`
  }

  /**
   *
   */
  getFile() {
    return this.file
  }

  transform() {
    return new Promise((resolve, reject) => {
      const onSpawnError = error => {
        this.timer.stop()

        reject(
          new AppError(
            `Unable to start the CLI!\n
            This can be caused by a corrupt installation, please make sure that the cli executable exists and works correctly.`,
            error
          )
        )
      }

      this.timer.start()

      let child

      try {
        child = $tools.transform(this)
      } catch (error) {
        onSpawnError(error)
        return
      }

      child.on('error', error => {
        // The process has reported an error before starting
        onSpawnError(error)
      })

      child.on('stdout', output => {
        // Output generated by the CLI
        output = output
          .toString()
          .trim()
          .split('\n')

        this.cli.lines.push(...output)
      })

      child.on('stderr', output => {
        // CLI error
        this.cli.lines.push(output)
        this.cli.error += `${output}\n`
      })

      child.on('ready', code => {
        this.timer.stop()

        if (code === 0) {
          // The process has been completed successfully
          // Update the output file information.
          this.file.update()
          resolve()
        } else {
          reject(
            new AppError(
              `The transformation #${this.id} has been interrupted by an CLI error. This can be caused by:\n
              - A corrupt installation (commonly: the checkpoints folder is corrupt)\n
              - Insufficient RAM. Buy more RAM!
              - If you are using GPU: The NVIDIA graphics card could not be found`,
              new Error(this.cli.error)
            )
          )
        }
      })
    })
  }
}
