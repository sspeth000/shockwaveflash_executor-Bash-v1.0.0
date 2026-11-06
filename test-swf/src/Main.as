package {
    import flash.display.Loader;
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.IOErrorEvent;
    import flash.net.URLRequest;
    import flash.text.TextField;
    import flash.text.TextFormat;

    [SWF(width="800", height="450", frameRate="30", backgroundColor="#151923")]
    public class Main extends Sprite {
        // Keep Main.swf and TestPanel.swf beside each other when hosting.
        private static const TEST_SWF_URL:String = "TestPanel.swf";

        private var loader:Loader;

        public function Main() {
            var label:TextField = new TextField();
            label.defaultTextFormat = new TextFormat("_sans", 16, 0xFFFFFF, true);
            label.width = 760;
            label.height = 32;
            label.x = 20;
            label.y = 16;
            label.selectable = false;
            label.text = "External SWF loader test";
            addChild(label);

            loader = new Loader();
            loader.contentLoaderInfo.addEventListener(Event.COMPLETE, onLoaded);
            loader.contentLoaderInfo.addEventListener(IOErrorEvent.IO_ERROR, onLoadError);
            addChild(loader);
            loader.load(new URLRequest(TEST_SWF_URL));
        }

        private function onLoaded(event:Event):void {
            trace("External SWF loaded.");
        }

        private function onLoadError(event:IOErrorEvent):void {
            trace("Could not load external SWF: " + event.text);
        }
    }
}