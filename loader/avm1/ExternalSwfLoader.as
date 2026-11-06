/*
 * AVM1 / ActionScript 2 loader helper.
 *
 * Compile this class with an ActionScript 2 toolchain and include it in the
 * parent SWF. Call:
 *   var panel:MovieClip = loader.ExternalSwfLoader.load(this, "TestPanel-AVM1.swf");
 *
 * The child SWF remains a separate file. The parent and child should both use
 * AVM1 for best compatibility.
 */
class loader.ExternalSwfLoader {
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
        var depth:Number = target.getNextHighestDepth();
        var container:MovieClip = target.createEmptyMovieClip(
            "externalSwf_" + nextId,
            depth
        );

        var movieLoader:MovieClipLoader = new MovieClipLoader();
        var listener:Object = {};

        listener.onLoadInit = function(loadedClip:MovieClip):Void {
            trace("AVM1 external child loaded: " + childUrl);
        };

        listener.onLoadError = function(
            failedClip:MovieClip,
            errorCode:String,
            httpStatus:Number
        ):Void {
            trace("AVM1 external child failed: " + errorCode +
                  " (HTTP " + httpStatus + ")");
        };

        movieLoader.addListener(listener);
        // Keep references alive for the lifetime of the loaded clip.
        container.__externalSwfLoader = movieLoader;
        container.__externalSwfListener = listener;
        movieLoader.loadClip(childUrl, container);

        return container;
    }

    public static function unload(container:MovieClip):Void {
        if (container == undefined) {
            return;
        }

        var movieLoader:MovieClipLoader = container.__externalSwfLoader;
        if (movieLoader != undefined) {
            movieLoader.unloadClip(container);
            movieLoader.removeListener(container.__externalSwfListener);
        }

        if (container._parent != undefined) {
            container.removeMovieClip();
        }
    }
}
