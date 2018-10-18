// Please, all the credit to the FABULOUS work of https://github.com/micropython/webrepl

class WebREPL {
    /**
     * Represents a WebREPL connection.
     * @constructor
     * @param {object} opts
     * @param {number} opts.binaryState
     * @param {string} opts.ip
     * @param {string} opts.password
     * @param {string} opts.sendFileName
     * @param {ArrayBuffer} opts.sendFileData
     * @param {string} opts.getFileName
     * @param {ArrayBuffer} opts.getFileData
     * @param {boolean} opts.autoconnect
     * @property {WebSocket} ws - WebSocket connection with board.
     * @property {number} [opts.binaryState=0]
     * @property {string} [opts.ip='192.168.4.1']
     * @property {string} [opts.password='micropythoN']
     * @property {string} [opts.sendFileName='']
     * @property {ArrayBuffer} [opts.sendFileData={}]
     * @property {string} [opts.getFileName='']
     * @property {ArrayBuffer} [opts.getFileData={}]
     * @property {boolean} [opts.autoconnect=false]
     * @example
     * let repl = new WebREPL({
     *     ip: '192.168.1.4',
     *     password: 'micropythoN',
     *     autoconnect: true
     * })
     */
    constructor(opts) {
        opts = opts || {}
        this.binaryState = 0
        this.ip = opts.ip || '192.168.4.1'
        this.password = opts.password || 'micropythoN'
        this.sendFileName = ''
        this.sendFileData = new ArrayBuffer()
        this.getFileName = ''
        this.getFileData = new ArrayBuffer()
        this.STOP = '\r\x03' // CTRL-C
        this.RESET = '\r\x04' // CTRL-D
        this.ENTER_RAW_REPL = '\r\x01' // CTRL-A
        this.EXIT_RAW_REPL = '\r\x04\r\x02' // CTRL-D + CTRL-B
        if (opts.autoconnect) {
            this.connect()
        }
    }

    /**
     * Creates a websocket connection following the WebREPL standards on the
     * ip set while instantiating `WebREPL` and binds events for its opening
     * and for parsing incoming messages.
     * @example
     * let repl = new WebREPL()
     * repl.connect()
     */
    connect() {
        this.ws = new WebSocket(`ws://${this.ip}:8266`)
        this.ws.binaryType = 'arraybuffer'
        this.ws.onopen = () => {
            this.onConnected()
            this.ws.onmessage = this._handleMessage.bind(this)
        }
    }

    /**
     * Close the current websocket connection.
     * @example
     * let repl = new WebREPL()
     * repl.disconnect()
     */
    disconnect() {
        this.ws.close()
    }

    /**
     * Called when websocket connection is opened.
     * @example
     * let repl = new WebREPL()
     * repl.onConnect = () => {
     *     console.log('connected')
     * }
     * repl.connect()
     */
    onConnected() {}

    /**
     * Called on incoming string websocket messages.
     * @param {string} msg - Incoming message from websocket connection.
     * @example
     * let repl = new WebREPL()
     * repl.onMessage = (msg) => {
     *     console.log('got message', msg)
     * }
     * repl.connect()
     */
    onMessage(msg) {}

    /**
     * Called when websocket connection sends a blob file to be saved.
     * @param {blob} blob - Incoming file from websocket connection.
     * @example
     * let repl = new WebREPL()
     * repl.saveAs = (blob) => {
     *     if(window.saveAs) {
     *         // From `FileSaver.js`
     *         saveAs(blob)
     *     } else {
     *         console.log('File to save', blob)
     *     }
     * }
     * repl.connect()
     */
    saveAs(blob) {}

    /**
     * Sends a keyboard interrupt character (CTRL-C).
     * @example
     * let repl = new WebREPL({ autoconnect: true })
     * let stopButton = document.querySelector('#stop-code')
     * repl.onConnected = () => {
     *     stopButton.addEventListener('click', repl.sendStop.bind(this))
     * }
     */
    sendStop() {
        this.eval(this.STOP)
    }

    /**
     * Sends a keyboard interruption (sendStop) and then the character to
     * perform a software reset on the board (CTRL-D).
     * @example
     * let repl = new WebREPL({ autoconnect: true })
     * let resetButton = document.querySelector('#reset-button')
     * repl.onConnected = function() {
     *     resetButton.addEventListener('click', repl.softReset.bind(this))
     * }
     */
    softReset() {
        this.sendStop()
        this.eval(this.RESET)
    }

    /**
     * Sends character to enter RAW Repl mode (CTRL-A).
     * @example
     * let repl = new WebREPL({ autoconnect: true })
     * repl.onConnected = function() {
     *      this.enterRawRepl()
     *      // Eval or execute code here
     *      this.exitRawRepl()
     * }
     */
    enterRawRepl() {
        this.eval(this.ENTER_RAW_REPL)
    }

    /**
     * Sends character to enter RAW Repl mode (CTRL-D + CTRL-B).
     * @example
     * let repl = new WebREPL({ autoconnect: true })
     * repl.onConnected = function() {
     *      this.enterRawRepl()
     *      // Eval or execute code here
     *      this.exitRawRepl()
     * }
     */
    exitRawRepl() {
        this.eval(this.EXIT_RAW_REPL)
    }

    /**
     * Evaluate command to the board followed by a line break (\r).
     * @param {string} command - Command to be executed by WebREPL.
     * @example
     * let repl = new WebREPL({ autoconnect: true })
     * repl.onConnected = function() {
     *     this.exec('print("hello world!")')
     * }
     */
    exec(command) {
        this.eval(command + '\r')
    }

    /**
     * Execute a string containing lines of code separated by `\n` in RAW REPL
     * mode. It will send a keyboard interrupt before entering RAW REPL mode.
     * @param {string} code - String containing lines of code separated by `\n`.
     * @example
     * let repl = new WebREPL({ autoconnect: true })
     * let code = `from time import sleep\nwhile True:\n    sleep(1)`
     * repl.onConnected = function() {
     *     this.execFromString(code)
     * }
     */
    execFromString(code) {
        this.sendStop()
        this.enterRawRepl()
        this.eval(code)
        this.exitRawRepl()
    }

    /**
     * Send command to websocket connection.
     * @param {string} command - Command to be sent.
     * @example
     * let repl = new WebREPL({ autoconnect: true })
     * repl.onConnected = function() {
     *     this.eval('print("hello world!")\')
     * }
     */
    eval(command) {
        this.ws.send(command)
    }

    /**
     * Save file to MicroPython's filesystem. Will use the filename from the
     * `file` argument object as the filesystem path.
     * @param {string} filename - Name of file to be sent
     * @param {Uint8Array} buffer - Typed array buffer with content of file
     * to be sent.
     * @example
     * let repl = new WebREPL({ autoconnect: true })
     * let filename = 'foo.py'
     * let buffer = new TextEncoder("utf-8").encode('print("hello world!")');
     * repl.sendFile(filename, buffer)
     */
    sendFile(filename, buffer) {
        this.sendFileName = filename
        this.sendFileData = buffer
        let rec = this._getPutBinary(
            this.sendFileName, this.sendFileData.length
        )
        // initiate put
        this.binaryState = 11
        console.log('Sending ' + this.sendFileName + '...')
        this.ws.send(rec)
    }

    /**
     * Given a filename and the file size, get a `Uint8Array` with fixed length
     * and specific bits set to send a "put" request to MicroPython.
     * @param {string} filename - File name
     * @param {number} filesize - Length of ArrayBuffer containing file data
     * @returns {Uint8Array}
     */
    _getPutBinary(filename, filesize) {
        // WEBREPL_FILE = "<2sBBQLH64s"
        let rec = new Uint8Array(2 + 1 + 1 + 8 + 4 + 2 + 64)
        rec[0] = 'W'.charCodeAt(0)
        rec[1] = 'A'.charCodeAt(0)
        rec[2] = 1 // put
        rec[3] = 0
        rec[4] = 0; rec[5] = 0; rec[6] = 0; rec[7] = 0; rec[8] = 0; rec[9] = 0; rec[10] = 0; rec[11] = 0;
        rec[12] = filesize & 0xff; rec[13] = (filesize >> 8) & 0xff; rec[14] = (filesize >> 16) & 0xff; rec[15] = (filesize >> 24) & 0xff;
        rec[16] = filename.length & 0xff; rec[17] = (filename.length >> 8) & 0xff;
        for (let i = 0; i < 64; ++i) {
            if (i < filename.length) {
                rec[18 + i] = filename.charCodeAt(i)
            } else {
                rec[18 + i] = 0
            }
        }
        return rec
    }

    /**
     * Load file from MicroPython's filesystem.
     * @param {string} filename - File name
     * @example
     * let repl = new WebREPL({ autoconnect: true })
     * let filename = 'foo.py'
     * repl.saveAs = (blob) => {
     *     console.log('File content', blob)
     * }
     * repl.loadFile(filename)
     */
    loadFile(filename) {
        this.getFileName = filename
        this.getFileData = new Uint8Array(0)
        let rec = this._getGetBinary(this.getFileName)
        // initiate get
        this.binaryState = 21
        console.log('Getting ' + this.getFileName + '...')
        this.ws.send(rec)
    }

    /**
     * Given a filename, get a `Uint8Array` with fixed length and specific bits
     * set to send a "get" request to MicroPython.
     * @param {string} filename - File name
     * @returns {Uint8Array}
     */
    _getGetBinary(filename) {
        // WEBREPL_FILE = "<2sBBQLH64s"
        let rec = new Uint8Array(2 + 1 + 1 + 8 + 4 + 2 + 64);
        rec[0] = 'W'.charCodeAt(0);
        rec[1] = 'A'.charCodeAt(0);
        rec[2] = 2; // get
        rec[3] = 0;
        rec[4] = 0; rec[5] = 0; rec[6] = 0; rec[7] = 0; rec[8] = 0; rec[9] = 0; rec[10] = 0; rec[11] = 0;
        rec[12] = 0; rec[13] = 0; rec[14] = 0; rec[15] = 0;
        rec[16] = filename.length & 0xff; rec[17] = (filename.length >> 8) & 0xff;
        for (let i = 0; i < 64; ++i) {
            if (i < filename.length) {
                rec[18 + i] = filename.charCodeAt(i);
            } else {
                rec[18 + i] = 0;
            }
        }
        return rec
    }

    /**
     * Remove file from MicroPython's filesystem.
     * @param {string} filename - File name
     * @example
     * let repl = new WebREPL({ autoconnect: true })
     * let filename = 'foo.py'
     * repl.removeFile(filename)
     */
    removeFile(filename) {
        const pCode = `from os import remove
remove('${filename}')`
        this.execFromString(pCode)
    }

    _decodeResp(data) {
        if (data[0] == 'W'.charCodeAt(0) && data[1] == 'B'.charCodeAt(0)) {
            var code = data[2] | (data[3] << 8)
            return code;
        } else {
            return -1;
        }
    }
    _handleMessage(event) {
        if (event.data instanceof ArrayBuffer) {
            let data = new Uint8Array(event.data)
            switch (this.binaryState) {
                case 11:
                    // first response for put
                    if (this._decodeResp(data) == 0) {
                        // send file data in chunks
                        for (let offset = 0; offset < this.sendFileData.length; offset += 1024) {
                            this.ws.send(this.sendFileData.slice(offset, offset + 1024))
                        }
                        this.binaryState = 12
                    }
                    break
                case 12:
                    // final response for put
                    if (this._decodeResp(data) == 0) {
                        console.log(`Sent ${this.sendFileName}, ${this.sendFileData.length} bytes`)
                    } else {
                        console.log(`Failed sending ${this.sendFileName}`)
                    }
                    this.binaryState = 0
                    break;
                case 21:
                    // first response for get
                    if (this._decodeResp(data) == 0) {
                        this.binaryState = 22
                        var rec = new Uint8Array(1)
                        rec[0] = 0
                        this.ws.send(rec)
                    }
                    break;
                case 22: {
                    // file data
                    var sz = data[0] | (data[1] << 8)
                    if (data.length == 2 + sz) {
                        // we assume that the data comes in single chunks
                        if (sz == 0) {
                            // end of file
                            this.binaryState = 23
                        } else {
                            // accumulate incoming data to this.getFileData
                            var new_buf = new Uint8Array(this.getFileData.length + sz)
                            new_buf.set(this.getFileData)
                            new_buf.set(data.slice(2), this.getFileData.length)
                            this.getFileData = new_buf
                            console.log('Getting ' + this.getFileName + ', ' + this.getFileData.length + ' bytes')

                            var rec = new Uint8Array(1)
                            rec[0] = 0
                            this.ws.send(rec)
                        }
                    } else {
                        this.binaryState = 0
                    }
                    break;
                }
                case 23:
                    // final response
                    if (this._decodeResp(data) == 0) {
                        console.log(`Got ${this.getFileName}, ${this.getFileData.length} bytes`)
                        this.saveAs(new Blob([this.getFileData], {type: "application/octet-stream"}), this.getFileName)
                    } else {
                        console.log(`Failed getting ${this.getFileName}`)
                    }
                    this.binaryState = 0
                    break
                case 31:
                    // first (and last) response for GET_VER
                    console.log('GET_VER', data)
                    this.binaryState = 0
                    break
            }
        }
        // If is asking for password, send password
        if( event.data == 'Password: ' ) {
            this.ws.send(`${this.password}\r`)
        }
        this.onMessage(event.data)
    }


}
