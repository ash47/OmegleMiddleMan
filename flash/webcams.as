package  {
	// Imports
	import flash.display.MovieClip;
	import flash.media.Video;
	import flash.net.NetStream;
	import flash.net.NetConnection;
	import flash.events.NetStatusEvent;
	import flash.external.ExternalInterface;

	public class webcams extends MovieClip {
		// The container for our video
		private var videoContainer:MovieClip;

		// Our network connection
		private var netConnection:NetConnection;

		// The video stream
		private var receiveStream:NetStream;

		// The server to connect to
		private var omegleServer = "rtmfp://rtmfp.omegle.com/";

		// The ID of the pain we are attached to
		private var painID:Number;

		// Init webcam
		public function webcams() {
			// Craete the video container
			videoContainer = new MovieClip();
			addChild(videoContainer);

            // Hook the stream
            ExternalInterface.addCallback("setPainID", this.setPainID);
            ExternalInterface.addCallback("gotStrangerPeerID", this.gotStrangerPeerID);
		}

		private function setPainID(newPainID):void {
			// Store the painID
			this.painID = newPainID;

			// Create the connection
			this.netConnection = new NetConnection();
            this.netConnection.addEventListener(NetStatusEvent.NET_STATUS,this.netConnectionHandler);
            this.netConnection.connect(omegleServer);
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
		}

		private function netConnectionHandler(status:NetStatusEvent):void {
			var c:Object = null;
			switch(status.info.code) {
				case "NetConnection.Connect.Success":
					// Tell our client our ID
         			ExternalInterface.call("setPeerID", this.painID, this.netConnection.nearID);
				break;

				case "NetConnection.Connect.Failed":
					this.netConnection = null;

					trace("Failed to connect!");
				break;

				case "NetConnection.Connect.Closed":
					this.netConnection = null;

					if(this.receiveStream) {
						this.receiveStream.close();
						this.receiveStream = null;
					}

					trace("Connection was closed!");
				break;
			}
		}
	}
}
