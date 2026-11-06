package loader.avm2 {
    import flash.display.Loader;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.IOErrorEvent;
    import flash.net.URLRequest;
    import flash.system.LoaderContext;

    /**
     * AVM2 / ActionScript 3 external Test Panel loader.
     * Compile this class into an AVM2 parent SWF.
     * The Test Panel remains a separate child SWF.
     */
    public class ExternalSwfLoader extends Sprite {
        private var child:Loader;

        public function ExternalSwfLoader(childUrl:String = "TestPanel-AVM2.swf") {
            child = new Loader();
            child.contentLoaderInfo.addEventListener(Event.COMPLETE, onLoaded);
            child.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, onLoadError);
            addChild(child);
            child.load(new URLRequest(childUrl), new LoaderContext());
        }

        private function onLoaded(event:Event):void {
            trace("AVM2 Test Panel loaded.");
        }

        private function onLoadError(event:IOErrorEvent):void {
            trace("AVM2 Test Panel failed: " + event.text);
        }

        public function unloadChild():void {
            if (!child) {
                return;
            }

            child.contentLoaderInfo.removeEventListener(Event.COMPLETE, onLoaded);
            child.contentLoaderInfo.removeEventListener(IOErrorEvent.IO_ERROR, onLoadError);

            if (child.parent) {
                removeChild(child);
            }

            child.unloadAndStop(true);
            child = null;
        }
    }
}
