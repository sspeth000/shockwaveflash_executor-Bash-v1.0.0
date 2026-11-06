/*
 * AVM1 / ActionScript 2 Test Panel child SWF.
 *
 * MTASC calls the static main(mc) entry point when this movie starts.
 * Build output: TestPanel-AVM1.swf
 */
class TestPanel {
    static function main(mc:MovieClip):Void {
        var testPanel:MovieClip = mc.createEmptyMovieClip("testPanel", mc.getNextHighestDepth());
        testPanel._x = 40;
        testPanel._y = 40;

        testPanel.lineStyle(2, 0x77E2CF, 100);
        testPanel.beginFill(0x111827, 97);
        testPanel.moveTo(0, 8);
        testPanel.curveTo(0, 0, 8, 0);
        testPanel.lineTo(252, 0);
        testPanel.curveTo(260, 0, 260, 8);
        testPanel.lineTo(260, 122);
        testPanel.curveTo(260, 130, 252, 130);
        testPanel.lineTo(8, 130);
        testPanel.curveTo(0, 130, 0, 122);
        testPanel.lineTo(0, 8);
        testPanel.endFill();

        var titleBar:MovieClip = testPanel.createEmptyMovieClip("titleBar", 1);
        titleBar.beginFill(0x26364D, 100);
        titleBar.moveTo(8, 0);
        titleBar.lineTo(252, 0);
        titleBar.lineTo(260, 8);
        titleBar.lineTo(260, 36);
        titleBar.lineTo(0, 36);
        titleBar.lineTo(0, 8);
        titleBar.endFill();

        titleBar.createTextField("heading", 2, 12, 7, 230, 22);
        titleBar.heading.text = "Bash Test Panel";
        titleBar.heading.selectable = false;
        var headingFormat:TextFormat = new TextFormat("_sans", 14, 0xFFFFFF, true);
        titleBar.heading.setTextFormat(headingFormat);
        titleBar.heading.setNewTextFormat(headingFormat);

        testPanel.createTextField("message", 3, 10, 58, 240, 42);
        testPanel.message.text = "It worked!";
        testPanel.message.selectable = false;
        var messageFormat:TextFormat = new TextFormat("_sans", 24, 0x77E2CF, true);
        testPanel.message.setTextFormat(messageFormat);
        testPanel.message.setNewTextFormat(messageFormat);

        titleBar.onPress = function():Void {
            this._parent.startDrag();
        };
        titleBar.onRelease = titleBar.onReleaseOutside = function():Void {
            this._parent.stopDrag();
        };
    }
}
