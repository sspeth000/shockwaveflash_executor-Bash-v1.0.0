/*
 * AVM1 / ActionScript 2 external Test Panel loader.
 *
 * Compile this class into an AVM1 parent SWF with an AS2 compiler.
 * Example:
 *   var panel:MovieClip = loader.avm1.ExternalSwfLoader.load(
 *       this,
 *       "TestPanel-AVM1.swf"
 *   );
 *
 * The Test Panel stays in its own external SWF.
 */
class loader.avm1.ExternalSwfLoader {
    private static var nextId:Number = 0;

    public static function load(target:MovieClip, childUrl:String):MovieClip {
        if (target == undefined) {
            trace("ExternalSwfLoader: target MovieClip is required.");
            return null;
        }

        if (childUrl == undefined || childUrl.length == 0) {
            childUrl = "TestPanel-AVM1.swf";
        }

        nextId++;
        var container:MovieClip = target.createEmptyMovieClip(
            "externalTestPanel_" + nextId,
            target.getNextHighestDepth()
        );

        var movieLoader:MovieClipLoader = new MovieClipLoader();
        var listener:Object = {};

        listener.onLoadInit = function(loadedClip:MovieClip):Void {
            trace("AVM1 Test Panel loaded: " + childUrl);
        };

        listener.onLoadError = function(
            failedClip:MovieClip,
            errorCode:String,
            httpStatus:Number
        ):Void {
            trace("AVM1 Test Panel failed: " + errorCode +
                  " (HTTP " + httpStatus + ")");
        };

        movieLoader.addListener(listener);
        container.__testPanelLoader = movieLoader;
        container.__testPanelListener = listener;
        movieLoader.loadClip(childUrl, container);

        return container;
    }

    public static function unload(container:MovieClip):Void {
        if (container == undefined) {
            return;
        }

        var movieLoader:MovieClipLoader = container.__testPanelLoader;
        if (movieLoader != undefined) {
            movieLoader.unloadClip(container);
            movieLoader.removeListener(container.__testPanelListener);
        }

        if (container._parent != undefined) {
            container.removeMovieClip();
        }
    }
}
