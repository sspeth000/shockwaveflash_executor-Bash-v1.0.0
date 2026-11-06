package {
    import flash.display.Sprite;
    import flash.events.MouseEvent;
    import flash.text.TextField;
    import flash.text.TextFormat;

    [SWF(width="640", height="360", frameRate="30", backgroundColor="#202633")]
    public class TestPanel extends Sprite {
        private var panel:Sprite;

        public function TestPanel() {
            panel = new Sprite();
            panel.graphics.beginFill(0x2D3748);
            panel.graphics.lineStyle(2, 0xA8F078);
            panel.graphics.drawRoundRect(0, 0, 250, 112, 16, 16);
            panel.graphics.endFill();
            panel.x = 195;
            panel.y = 115;
            addChild(panel);

            var title:TextField = new TextField();
            title.defaultTextFormat = new TextFormat("_sans", 24, 0xFFFFFF, true);
            title.width = 230;
            title.height = 48;
            title.x = 10;
            title.y = 34;
            title.selectable = false;
            title.mouseEnabled = false;
            title.text = "It worked!";
            panel.addChild(title);

            panel.addEventListener(MouseEvent.MOUSE_DOWN, startDragPanel);
            panel.addEventListener(MouseEvent.MOUSE_UP, stopDragPanel);
            stage.addEventListener(MouseEvent.MOUSE_UP, stopDragPanel);
        }

        private function startDragPanel(event:MouseEvent):void {
            panel.startDrag();
        }

        private function stopDragPanel(event:MouseEvent):void {
            panel.stopDrag();
        }
    }
}