package {
    import flash.display.Sprite;
    import flash.events.Event;
    import flash.events.MouseEvent;
    import flash.text.TextField;
    import flash.text.TextFormat;

    /**
     * AVM2 / ActionScript 3 Test Panel child SWF.
     * Compile this document class as TestPanel-AVM2.swf.
     */
    public class TestPanel extends Sprite {
        private var titleBar:Sprite;

        public function TestPanel() {
            graphics.beginFill(0x111827, 0.97);
            graphics.lineStyle(2, 0x77E2CF, 1);
            graphics.drawRoundRect(0, 0, 260, 130, 14, 14);
            graphics.endFill();

            titleBar = new Sprite();
            titleBar.graphics.beginFill(0x26364D);
            titleBar.graphics.drawRoundRect(0, 0, 260, 36, 12, 12);
            titleBar.graphics.endFill();
            titleBar.buttonMode = true;
            addChild(titleBar);

            var heading:TextField = makeText("Bash Test Panel", 14, 0xFFFFFF, true);
            heading.x = 12;
            heading.y = 7;
            heading.width = 230;
            heading.height = 22;
            addChild(heading);

            var message:TextField = makeText("It worked!", 24, 0x77E2CF, true);
            message.x = 10;
            message.y = 58;
            message.width = 240;
            message.height = 42;
            addChild(message);

            titleBar.addEventListener(MouseEvent.MOUSE_DOWN, onDragStart);
            addEventListener(Event.ADDED_TO_STAGE, onAdded);
        }

        private function makeText(
            value:String,
            size:int,
            color:uint,
            bold:Boolean
        ):TextField {
            var field:TextField = new TextField();
            field.defaultTextFormat = new TextFormat("_sans", size, color, bold);
            field.text = value;
            field.selectable = false;
            field.mouseEnabled = false;
            return field;
        }

        private function onAdded(event:Event):void {
            stage.addEventListener(MouseEvent.MOUSE_UP, onDragStop);
        }

        private function onDragStart(event:MouseEvent):void {
            startDrag();
        }

        private function onDragStop(event:MouseEvent):void {
            stopDrag();
        }
    }
}
