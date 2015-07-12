package  {
	// Imports
	import flash.display.MovieClip;
	import flash.media.Video;
	import flash.net.NetStream;
	import flash.net.NetConnection;
	import flash.events.NetStatusEvent;
	import flash.external.ExternalInterface;
	import flash.media.Camera;
	import flash.media.Microphone;
	import flash.media.SoundCodec;

	public class webcams extends MovieClip {
		// The container for our video
		private var videoContainer:MovieClip;

        // The container for us
        private var selfContainer:MovieClip;

        // The local stream
        private var localVideo:Video;

		// Our network connection
		private var netConnection:NetConnection;

		// The video stream
		private var receiveStream:NetStream;

		// The output stream
		private var sendStream:NetStream;

		// The server to connect to
		private var omegleServer = "rtmfp://rtmfp.omegle.com/";

		// The ID of the pain we are attached to
		private var painID:Number;

		// The camera
		private var camera:Camera;

      	// The microphone
	    private var microphone:Microphone;

	    // The name of the camera
	    private var cameraName:String;

	    // The ID of the mic
	    private var micID:Number;

        // Camera sizing
        private var overrideWidth:Number = 320;
        private var overrideHeight:Number = 240;
        private var overrideFPS:Number = 24;
        private var overrideQuality:Number = 91;

		// Init webcam
		public function webcams() {
			// Craete the video container
			videoContainer = new MovieClip();
			addChild(videoContainer);

            // Create the self container
            selfContainer = new MovieClip();
            addChild(selfContainer);

            // Scale of your webcam
            var sc:Number = (400-320)/320;

            selfContainer.scaleX = sc;
            selfContainer.scaleY = sc;
            selfContainer.x = 320;
            selfContainer.y = 240 - (240*sc);

            // Craete local stream
            localVideo = new Video();
            selfContainer.addChild(localVideo);

            // Hook the stream
            ExternalInterface.addCallback("setPainID", this.setPainID);
            ExternalInterface.addCallback("gotStrangerPeerID", this.gotStrangerPeerID);
            ExternalInterface.addCallback("setCameraName", this.setCameraName);
            ExternalInterface.addCallback("setMicID", this.setMicID);
            ExternalInterface.addCallback("setCameraSize", this.exteranlCameraSize);
		}

		private function setCameraName(cam:String):void {
			this.cameraName = cam;

			// The camera changed
			cameraChanged();
		}

        private function exteranlCameraSize(width:Number = 320, height:Number = 240, fps:Number = 24, quality:Number = 91):void {
            // Store vars
            this.overrideWidth = width;
            this.overrideHeight = height;
            this.overrideFPS = fps;
            this.overrideQuality = quality;

            // Do the change
            cameraChanged();
        }

		private function setMicID(mic:Number):void {
			this.micID = mic;

			// The mic changed
			micChanged();
		}

		private function setPainID(newPainID, videoServer, videoPassword):void {
			// Store the painID
			this.painID = newPainID;

			// Create the connection
			this.netConnection = new NetConnection();
            this.netConnection.addEventListener(NetStatusEvent.NET_STATUS,this.netConnectionHandler);
            this.netConnection.connect(videoServer || omegleServer, videoPassword);

            // Log it
            ExternalInterface.call("console.log", "Connecting to video server...");
		}

		private function stopChat():void {
			if(this.sendStream) {
            	this.sendStream.attachAudio(null);
            	this.sendStream.attachCamera(null);
         	}
		}

		private function gotStrangerPeerID(peerID:String):void {
			// Cleanup old connections
			if(this.receiveStream) {
				this.receiveStream.close();
				this.receiveStream = null;
			}

			// Cleanup the container
			while (videoContainer.numChildren > 0) {
			    videoContainer.removeChildAt(0);
			}

			// Create the video
			this.receiveStream = new NetStream(this.netConnection, peerID);
			var video:Video = new Video();
			video.smoothing = true;
			video.attachNetStream(this.receiveStream);
 			this.receiveStream.play("omegle");

 			// Add it to our container
 			videoContainer.addChild(video);

 			// Attach
           	cameraChanged();
           	micChanged();
		}

		private function cameraChanged():void {
            // Ensure they have cams
            if(Camera.names.length <= 0) return;

			// Grab the objects
			this.camera = Camera.getCamera(this.cameraName);

			if(this.camera) {
            	this.camera.setMode(this.overrideWidth,this.overrideHeight,this.overrideFPS);
            	this.camera.setQuality(0,this.overrideQuality);
        	}

         	if(this.sendStream) {
               this.sendStream.attachCamera(this.camera);
            }

            // Attach to local stream
            localVideo.attachCamera(this.camera);
		}

		private function micChanged():void {
            // Ensure they have mics
            if(Microphone.names.length <= 0) return;

			// Grab the objects
         	this.microphone = Microphone.getMicrophone(this.micID);

         	if(this.microphone) {
	            this.microphone.setSilenceLevel(0, 1000);
    	        this.microphone.setUseEchoSuppression(true);
        	    this.microphone.framesPerPacket = 1;
            	this.microphone.codec = SoundCodec.SPEEX;
         	}

         	if(this.sendStream) {
               this.sendStream.attachAudio(this.microphone);
            }
		}

		private function netConnectionHandler(status:NetStatusEvent):void {
            switch(status.info.code) {
				case "NetConnection.Connect.Success":
                    // Log it
                    ExternalInterface.call("console.log", "Connected successfully!");

					// Tell our client our ID
         			ExternalInterface.call("setPeerID", {
         				painID: this.painID,
         				nearID: this.netConnection.nearID,
         				cameras: Camera.names,
         				mics: Microphone.names
         			});

         			// Connection manager
         			var c:Object = new Object();
		           	c.onPeerConnect = function(stranger:NetStream):Boolean {
		           		// Implement security?

		           		return true;
		           	};

         			// Create the send stream
         			this.sendStream = new NetStream(this.netConnection,NetStream.DIRECT_CONNECTIONS);
         			this.sendStream.client = c;
	               	this.sendStream.publish("omegle");

	               	// Attach
	               	cameraChanged();
	               	micChanged();
				break;

				case "NetConnection.Connect.Failed":
					this.netConnection = null;

					ExternalInterface.call("console.log", "Failed to connect!");
				break;

				case "NetConnection.Connect.Closed":
					this.netConnection = null;

					if(this.receiveStream) {
						this.receiveStream.close();
						this.receiveStream = null;
					}

					ExternalInterface.call("console.log", "Connection was closed!");
				break;

                default:
                    ExternalInterface.call("console.log", "Unknown connection issue!");
                break;
			}
		}
	}
}
