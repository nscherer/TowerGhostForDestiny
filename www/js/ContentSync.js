SyncTask = new (function(){
	
	this.create = function(options){
		var syncTask = $({});
		this.options = options;
		
		$.ajax({
			url: "http://towerghostfordestiny.com/versions.cfm",/*options.src*/
			success: function(data){
				var event = jQuery.Event( "complete" );
				event.localPath = "data";
				syncTask.trigger(event);
			}
		});
		
		return syncTask;
	}

})
 

ContentSync = new (function(){
	this.sync = function(options){
		return SyncTask.create(options);
	}
});
