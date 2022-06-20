//variables
var peer = "";
var conn =  "";
var me = "";
var other = "";
var b64 = "";

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
function readFileBase64() {
    if (this.files && this.files[0]) {
        var FR= new FileReader();
        FR.addEventListener("load", function(e) {
            b64 = e.target.result;
            return b64;
        }); 
        FR.readAsDataURL( this.files[0] );
    }
};
document.getElementById("image-upload").addEventListener("change", readFileBase64);

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
    });
    peer.on('close', function() {
        conn = null;
        $('.chat').html('');
        showErrorMessage('Connection destroyed');
        $('.chat-footer').hide();
    });
    peer.on('error', function (err) {
        showErrorMessage(err);
    });
};
function recive(){
    conn.on('data', function (data) {
        var data = decrypt(data,other);
        if(data != ""){
            buildMessage('from',data);
        }
    });
    conn.on('close', function () {
        $('.chat').html('');
        showErrorMessage("Connection closed");
        $('.chat-footer').hide();
    });
};
function send(){
    if($('.message-text').val() != ""){
        var msg = encrypt($('.message-text').val(),me);
        if (conn && conn.open) {
            conn.send(msg);
            buildMessage('to',$('.message-text').val());
            $('.message-text').val('');
        }else{
            $('.chat').html('');
            showErrorMessage('connection closed');
            $('.chat-footer').hide();
        }
    }
    if(b64 != ""){
        var img = '<img class="w-100 h-100 rounded" src="' + b64 + '"/>';
        var msg = encrypt(img,me);
        if (conn && conn.open) {
            conn.send(msg);
            buildMessage('to',img);
            $('#image-upload').val('');
            b64 = "";
        }else{
            $('.chat').html('');
            showErrorMessage('connection closed');
            $('.chat-footer').hide();
        }
    }
};
function join(id) {
    if (conn) {
        showInfoMessage("Closing current connection");
        $('.chat-footer').hide();
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