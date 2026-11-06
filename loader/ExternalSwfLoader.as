package loader {
    import flash.display.Loader;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.IOErrorEvent;
    import flash.net.URLRequest;

    /** Compile into the parent project's source. TestPanel.swf stays external. */
    public class ExternalSwfLoader extends Sprite {
        private var child:Loader;

        public function ExternalSwfLoader(childUrl:String = "TestPanel.swf") {
            child = new Loader();
            child.contentLoaderInfo.addEventListener(Event.COMPLETE, onLoaded);
            child.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, onLoadError);
            addChild(child);
            child.load(new URLRequest(childUrl));
        }

        private function onLoaded(event:Event):void {
            trace("External TestPanel SWF loaded.");
        }

        private function onLoadError(event:IOErrorEvent):void {
            trace("External child SWF failed to load: " + event.text);
        }

        public function unloadChild():void {
            if (child && child.parent) {
                child.unloadAndStop(true);
                removeChild(child);
            }
        }
    }
}
