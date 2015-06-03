var serialport = require("serialport");
var SerialPort = serialport.SerialPort;
var util = require("util");
var events = require("events");


var openSerialPort = function (portName, callback) {

    // Setup a SerialPort instance
    var sp = new SerialPort(portName, {
        baudRate: 9600,
        dataBits: 7,
        parity: 'even',
        stopBits: 1,
        flowControl: true,
        parser: serialport.parsers.raw

    }, false);

    sp.open(function () {
        console.log('- Serial port is open');
        sp.on('data', callback);
    });

    return sp;
};

//  Returns result from applying regex to data (string)
var returnRegExResult = function (data, regex) {
    var result = data.match(regex);

    if (result != undefined) {
        return result[1];
    } else {
        return undefined;
    }

}; // returnRegExResult

function newLineStream(callback) {
    var buffer = '';

    return (function (chunk) {
        convertedChunk = new Buffer(chunk, 'binary').toString('ascii');

        var i,
            piece = '',
            offset = 0;
        buffer += convertedChunk;
        while ((i = buffer.indexOf('!', offset)) !== -1) {
            piece = buffer.substr(offset, i - offset);
            offset = i + 1;
            callback(piece);
        }
        buffer = buffer.substr(offset);
    });
} // newLineStream

var P1DataStream = function (opts) {
    this.portName = opts.portName;
    var self = this;

    var processDatagram = function (data) {

        var convertedChunk = new Buffer(data, 'binary').toString('ascii');

        var rateOneTotalUsage = returnRegExResult(convertedChunk, /^1-0:1.8.1\(0+(.*?)\.0+\*/m);
        var rateTwoTotalUsage = returnRegExResult(convertedChunk, /^1-0:1.8.2\(0+(.*?)\.0+\*/m);
        var currentTariff = returnRegExResult(convertedChunk, /^0-0:96.14.0\(0+(.*?)\)/m);
        var currentUsage = returnRegExResult(convertedChunk, /^1-0:1.7.0\((.*?)\*/m);

        var dataGram = {
            rateOneTotalUsage: rateOneTotalUsage * 1,
            rateTwoTotalUsage: rateTwoTotalUsage * 1,
            currentTariff: currentTariff * 1,
            currentUsage: currentUsage * 1000
        };

        console.log('Raw data received: ' + data);
        //console.log('self' + self.portName);

        self.emit("data", dataGram);
    };


    var listener = newLineStream(processDatagram);

    openSerialPort(this.portName, listener);
    events.EventEmitter.call(this);
};

util.inherits(P1DataStream, events.EventEmitter);

module.exports = P1DataStream;
