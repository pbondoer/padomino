// request MIDI access
if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess({
        sysex: false
    }).then(onMIDISuccess, onMIDIFailure);
} else {
    alert("No MIDI support in your browser.");
}

var launchpad;
var buffer = 0;
var doubleBuffering = 0;

var C_RED = 0x03;
var C_ORANGE = 0x33;
var C_YELLOW = 0x32;
var C_GREEN = 0x30;

// midi functions
function onMIDISuccess(midi) {
    // when we get a succesful response, run this code
    console.log('MIDI Access Object', midi);
    
    // look for our launchpad
    var inputs = midi.inputs.values();
    for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
        input = input.value;
        
        if (input.name == "Launchpad")
        {
            console.log("Found Launchpad, binding onMIDIMessage");
            input.onmidimessage = onMIDIMessage;
        }
    }
    
    var outputs = midi.outputs.values();
    for (var output = outputs.next(); output && !output.done; output = outputs.next()) {
        output = output.value;
        if (output.name == "Launchpad")
        {
            launchpad = output;
            
            // ensure our launchpad is completely clean
            reset(output);
            
            toggleDoubleBuffering();
            
            // give it a test
            render();
            
            console.log(output);
        }
    }
    
    //TODO: Check if we successfully found our Launchpad
}

function dataToPos(data)
{
    return {x: data & 0x0F, y: data >> 4};
}

function posToData(pos)
{
    return (pos.y << 4) + pos.x;
}

function reset() {
    launchpad.send([0xB0, 0x00, 0x00]);
}

function toggleDoubleBuffering() {
    if (doubleBuffering)
    {
        launchpad.send([0xB0, 0x00, 0x00]);
        doubleBuffering = false;
    }
    else
        switchBuffer();
}

function switchBuffer()
{
    if (buffer)
        launchpad.send([0xB0, 0x00, 0x31]);
    else
        launchpad.send([0xB0, 0x00, 0x34]);        
    buffer = !buffer;
    console.log("switched to buffer " + buffer);
    if (!doubleBuffering)
        doubleBuffering = 1;
}

var map = [ 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0 ];

var prevMap = map.slice(0);

function mapToColor(i)
{
    if (i == 0)
        return 0x00;
    else if (i == 1)
        return C_RED;
    else if (i == 2)
        return C_YELLOW;
    else if (i == 3)
        return C_ORANGE;
    else if (i == 4)
        return C_GREEN;
}

function render(output) {
    for (var i = 0; i < 8 * 8; i++)
    {
        //map[i] = !map[i];
        map[i] = Math.round(Math.random() * 4);
    }
    console.log(map);
    console.log(prevMap);
    
    for (i = 0; i < 64; i++)
    {
        if (map[i] != prevMap[i])
        {
            var data = posToData({x: i % 8, y: Math.floor(i / 8) });
            launchpad.send([0x90, data, mapToColor(map[i])]);
        }
    }

    prevMap = map.slice(0);
    switchBuffer();
}

function onMIDIMessage(e) {
    console.log(e);
    //0 - type
    //1 - button
    //2 - velocity
    
    if (e.data[0] == 144) {
        // Note on        
        console.log("Button " + (e.data[2] ? "pressed" : "released"));
        if (e.data[2])
        {
            render();
            //launchpad.send([0x90, posToData(dataToPos(e.data[1])), 127]);
        } else {
            
            //launchpad.send([0x80, e.data[1], 0x00]);
        }
        console.log(dataToPos(e.data));
    }
}

function onMIDIFailure(e) {
    // when we get a failed response, run this code
    console.log("No access to MIDI devices or your browser doesn't support WebMIDI API. Please use WebMIDIAPIShim " + e);
}
