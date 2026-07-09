export namespace main {
	
	export class AddProjectResult {
	    success: boolean;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new AddProjectResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.error = source["error"];
	    }
	}
	export class ProjectConfig {
	    path: string;
	    name: string;
	    command: string;
	
	    static createFrom(source: any = {}) {
	        return new ProjectConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.name = source["name"];
	        this.command = source["command"];
	    }
	}
	export class ProjectConfigUpdate {
	    name?: string;
	    command?: string;
	
	    static createFrom(source: any = {}) {
	        return new ProjectConfigUpdate(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.command = source["command"];
	    }
	}
	export class StartProjectResult {
	    success: boolean;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new StartProjectResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.error = source["error"];
	    }
	}

}

