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

var C_BLOCKS = 1;
var C_LAST   = 2;
var C_FALL   = 3;
var C_CLEAR  = 4;

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

function dataToPos(data) {
    return {x: data & 0x0F, y: data >> 4};
}

function posToData(pos) {
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
function switchBuffer() {
    if (buffer)
        launchpad.send([0xB0, 0x00, 0x31]);
    else
        launchpad.send([0xB0, 0x00, 0x34]);        
    buffer = !buffer;
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

function mapToColor(i) {
    if (i == 0)
        return 0x00;
    else if (i == C_BLOCKS)
        return C_RED;
    else if (i == C_LAST)
        return C_ORANGE;
    else if (i == C_FALL)
        return C_YELLOW;
    else if (i == C_CLEAR)
        return C_GREEN;
}
function cleanMap(a, b) {
    for (i = 0; i < 64; i++)
    {
        if (map[i] == a)
            map[i] = b;
    }
}

function render() {
    merge_map();
    
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
            if(dataToPos(e.data[1]).x < 4)
                cur_pos.x--;
            else
                cur_pos.x++;
            
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

// TETRIS

var pieces = 
    [
        [3, 2,
         0, 1, 1,
         1, 1, 0],
        
        [4, 1,
         1, 1, 1, 1],
        
        [3, 2,
         1, 1, 1,
         0, 1, 0],
        
        [3, 2,
         1, 1, 0,
         0, 1, 1],
        
        [2, 2,
         1, 1,
         1, 1],
        
        [2, 3,
         1, 0,
         1, 0,
         1, 1],
        
        [2, 3,
         0, 1,
         0, 1,
         1, 1]
    ];

var cur_pos;

var tetri;
var w;
var h;

function random_piece()
{
    tetri = pieces[Math.round(Math.random() * (pieces.length - 1))].slice(0);
    rotate();
    cur_pos = {x: 4 - Math.floor(tetri[0] / 2), y: 0};
    
    tetri = tetri.slice(0);
    
    w = tetri.shift();
    h = tetri.shift();
}

function rotate()
{
    //TODO: Rotate
}

random_piece();

function place(i)
{
    for(var y = 0; y < h; y++)
    {
        for(var x = 0; x < w; x++)
        {
            if (tetri[y * w + x])
                map[(y + cur_pos.y - (h - 1)) * 8 + (x + cur_pos.x)] = i;
        }
    }
}

function merge_map()
{
    cleanMap(C_FALL, 0);
    place(C_FALL);
}

function update()
{
    render();
}

function gravity()
{
    cur_pos.y++;
    if (cur_pos.y >= 7)
    {
        cleanMap(C_LAST, C_BLOCKS);
        place(C_LAST);
        random_piece();
    }
    update();
}

setInterval(update, 100);
setInterval(gravity, 1000);
