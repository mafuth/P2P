//variables
var peer = "";
var conn =  "";
var me = "";
var other = "";
var fileHash = "";
const torrentClient = new WebTorrent();

//custom side toast functions
function showSuccessMessage(message){
    Toastify({
        text: message,
        duration: 3000,
        close: false,
        gravity: "top",
        position: "left",
        stopOnFocus: true,
        className: "info",
        style: {
            background: "green",
        }
    }).showToast();
}
function showErrorMessage(message){
    Toastify({
        text: message,
        duration: 3000,
        close: false,
        gravity: "top",
        position: "left",
        stopOnFocus: true,
        className: "info",
        style: {
            background: "red",
        }
    }).showToast();
}
function showInfoMessage(message){
    Toastify({
        text: message,
        duration: 3000,
        close: false,
        gravity: "top",
        position: "left",
        stopOnFocus: true,
        className: "info",
        style: {
            background: "blue",
        }
    }).showToast();
}
// Human readable bytes util
function prettyBytes(num) {
    const units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const neg = num < 0
    if (neg) num = -num
    if (num < 1) return (neg ? '-' : '') + num + ' B'
    const exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1)
    const unit = units[exponent]
    num = Number((num / Math.pow(1000, exponent)).toFixed(2))
    return (neg ? '-' : '') + num + ' ' + unit
}

//encryption and decryption of data
function encrypt(msg,key){
    return btoa(CryptoJS.AES.encrypt(msg,key));
}
function decrypt(msg,key){
    return CryptoJS.AES.decrypt(atob(msg), key).toString(CryptoJS.enc.Utf8);
}

//chat builder
function buildMessage(type,data){
    if(type == "from"){
        $('.chat').append('<div class="alert alert-primary" role="alert">' + data + '</div>')
    }
    if(type == "to"){
        $('.chat').append('<div class="alert alert-success" role="alert">' + data + '</div>')
    }
    $('html,body').animate({scrollTop: document.body.scrollHeight},"fast");
}

//file reader
function seedFile() {
    $('.send-message').hide();
    if (this.files && this.files[0]) {
        torrentClient.seed(this.files[0], function (torrent) {
            torrentDATA = torrent;
            fileHash = torrent.infoHash;
            const interval = setInterval(function () {
                showWormholeStatus(torrent.uploadSpeed,torrent.downloadSpeed);
            }, 1000)
            torrent.on('done', function () {
                clearInterval(interval)
            })
        })
    }
    $('.send-message').show();
};
document.getElementById("file-upload").addEventListener("change", seedFile);

//peerjs functions
function initialize() {
    // Create own peer object with connection to shared PeerJS server
    peer = new Peer(null, {
        debug: 2
    });

    peer.on('open', function (id) {
        if(peer.id != ""){
            lastPeerId = peer.id;
            me = peer.id;
            var qr = "https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl="+me+"&choe=UTF-8";
            $('.my-hash-qr').attr('src',qr);
            $('.my-hash-qr').show();
            $('.new-con-btn').show();
            $('.myID').html(me);
            $('.chat').html('');
            showSuccessMessage('Connection made to peer network');
            showSuccessMessage('Ready');
            $('.initiateConn').click(function(){
                var id = $('.connID').val();
                showInfoMessage('connecting to '+id);
                join(id);
            });
            $('.send-message').click(function(){
                send();
            });
            $('.new-call-btn').click(function(){
                setupCall();
            });
            $('.initiateCall').click(function(){
                initiateCall();
            });
        }else{
            showErrorMessage('Error generating an id');
        }
    });
    peer.on('connection', function (c) {
        showInfoMessage("Incomming connection")
        // Allow only a single connection
        if (conn && conn.open) {
            c.on('open', function() {
                c.send("Already connected to another client");
                showErrorMessage("Incomming from: " + conn.peer + "was dissmissed due to exsisting connection")
                setTimeout(function() { c.close(); }, 500);
            });
            return;
        }
        conn = c;
        showSuccessMessage("Connected to: " + conn.peer);
        $('.connectedTO').html(conn.peer);
        $('.chat-footer').show();
        other = conn.peer;
        recive()
    });
    peer.on('disconnected', function () {
        showErrorMessage('Connection lost. Please reconnect');
        // Workaround for peer.reconnect deleting previous id
        peer.id = lastPeerId;
        peer._lastServerId = lastPeerId;
        peer.reconnect();
        showErrorMessage('Connection destroyed');
        $('.chat-footer').hide();
        $('.connectedTO').html('');
    });
    peer.on('close', function() {
        conn = null;
        $('.chat').html('');
        showErrorMessage('Connection destroyed');
        $('.chat-footer').hide();
        $('.connectedTO').html('');
    });
    peer.on('error', function (err) {
        showErrorMessage(err);
    });
    var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    peer.on('call', function(call) {
        $('#callModal').modal('show');
        $('.initiateCall').hide();
        $('.acceptCall').show();
        $('.acceptCall').click(function(){
            getUserMedia({video: true, audio: true}, function(stream) {
                call.answer(stream); // Answer the call with an A/V stream.
                call.on('stream', function(remoteStream) {
                    document.getElementById('my-stream').srcObject = stream;
                    document.getElementById('peer-stream').srcObject = remoteStream;
                    $('.acceptCall').hide();
                });
            }, function(err) {
                showErrorMessage('Failed to get local stream: ' + err);
            });
        });
    });
};
function setupCall(){
    var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    getUserMedia({video: true, audio: true}, function(stream) {
        document.getElementById('my-stream').srcObject = stream;
        $('.initiateCall').show();
    }, function(err) {
        showErrorMessage('Failed to get local stream: ' + err);
    });
}
function initiateCall(){
    if (conn) {
        var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
        getUserMedia({video: true, audio: true}, function(stream) {
        var call = peer.call(other, stream);
        call.on('stream', function(remoteStream) {
            document.getElementById('my-stream').srcObject = stream;
            document.getElementById('peer-stream').srcObject = remoteStream;
            $('.initiateCall').hide();
            $('.acceptCall').hide();
        });
        }, function(err) {
            showErrorMessage('Failed to get local stream: ' + err);
        });
    }else{
        showErrorMessage('No connection found');
    }
}
function recive(){
    conn.on('data', function (data) {
        var data = decrypt(data,other);
        if(data != ""){
            data = JSON.parse(data);
            if(data['type'] == 'message'){
                buildMessage('from',data['data']);
            }else{
                showSuccessMessage('Recived a wormhole connection');
                showInfoMessage('Starting file transfer');
                torrentClient.add('magnet:?xt=urn:btih:'+ data['data'] + '&dn=290436838_531413252000406_1788028471575614066_n.jpg&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337', onTorrent);
            }
        }
    });
    conn.on('close', function () {
        $('.chat').html('');
        showErrorMessage("Connection closed");
        $('.chat-footer').hide();
        $('.connectedTO').html('');
    });
};
function showWormholeStatus(upload,download){
    $('#upSpeed').html('Upload: '+prettyBytes(upload)+'/s');
    $('#downSpeed').html('Download: '+prettyBytes(download)+'/s');
}
function checkImage(fileName){
    fileName = fileName.toLowerCase()
    if(fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.gif')){
        return true;
    }else{
        return false;
    }
}
function onTorrent(torrent){
    const interval = setInterval(function () {
        showWormholeStatus(torrent.uploadSpeed,torrent.downloadSpeed);
    }, 1000)
    torrent.on('done', function () {
        clearInterval(interval)
    })

    torrent.files.forEach(function (file) {
        file.getBlobURL(function (err, url) {
          if (err) return console.log(err.message)
          if(checkImage(file.name) == true){
            buildMessage('from','<img src="'+url+'" class="w-100"/>');
          }
          if(file.name.endsWith('.mp4')){
            buildMessage('from','<video src="'+url+'" class="w-100" controls></video>');
          }
          if(!file.name.endsWith('.mp4') && checkImage(file.name) == false){
            buildMessage('from','<a href="' + url + '" target="_blank">Download File: ' + file.name + '</a>');
          }
        })
    })
}
function send(){
    if($('.message-text').val() != ""){
        var msg = encrypt(JSON.stringify({type:'message', data: $('.message-text').val()}),me);
        if (conn && conn.open) {
            conn.send(msg);
            buildMessage('to',$('.message-text').val());
            $('.message-text').val('');
        }else{
            $('.chat').html('');
            showErrorMessage('connection closed');
            $('.chat-footer').hide();
            $('.connectedTO').html('');
        }
    }
    if(fileHash != ""){
        var msg = encrypt(JSON.stringify({type:'file', data: fileHash}),me);
        if (conn && conn.open) {
            conn.send(msg)
            torrentDATA.files.forEach(function (file) {
                file.getBlobURL(function (err, url) {
                  if (err) return console.log(err.message)
                  if(checkImage(file.name) == true){
                    buildMessage('from','<img src="'+url+'" class="w-50 h-50"/>');
                  }
                  if(file.name.endsWith('.mp4')){
                    buildMessage('from','<video src="'+url+'" class="w-50 h-50" controls></video>');
                  }
                  if(!file.name.endsWith('.mp4') && checkImage(file.name) == false){
                    buildMessage('from','<a href="' + url + '" target="_blank">Download File: ' + file.name + '</a>');
                  }
                })
            })
            showSuccessMessage('Wormhole established sharing file');
            $('#image-upload').val('');
            torrentDATA = "";
            fileHash = "";
        }else{
            $('.chat').html('');
            showErrorMessage('connection closed');
            $('.chat-footer').hide();
            $('.connectedTO').html('');
        }
    }
};
function join(id) {
    if (conn) {
        showInfoMessage("Closing current connection");
        $('.chat-footer').hide();
        $('.connectedTO').html('');
        $('.chat').html('');
        conn.close();
    }
    conn = peer.connect(id, {
        reliable: true
    });
    conn.on('open', function () {
        showSuccessMessage("Connected to: " + conn.peer);
        $('.connectedTO').html(conn.peer);
        $('.chat-footer').show();
    });
    other = id;
    recive();
};
initialize()