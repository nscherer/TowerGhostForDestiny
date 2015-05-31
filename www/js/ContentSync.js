SyncTask = new(function() {

    this.create = function(options) {
        var syncTask = $({});
        this.options = options;

        /* 1 min to load the www.zip 
        setTimeout(function() {
            var event = jQuery.Event("complete");
            event.localPath = "";
            syncTask.trigger(event);
        }, 1000 * 60); */

        setTimeout(function() {
            var event = jQuery.Event("progress");
            event.progress = 5;
            event.status = 1;
            syncTask.trigger(event);
        }, 1000);

        return syncTask;
    }

})

if (!isMobile) {

    ContentSync = new(function() {
        this.sync = function(options) {
            return SyncTask.create(options);
        }
    });

}