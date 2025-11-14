// Background jobs - disabled Supabase usage
// TODO: Migrate to API endpoints when available
export const jobs = {
  complianceWatchdog: {
    interval: null as NodeJS.Timeout | null,

    start() {
      // TODO: Implement via API endpoint
      console.warn('complianceWatchdog job disabled - needs API migration');
      this.interval = setInterval(async () => {
        // Disabled - requires API endpoint
      }, 60000);
    },

    stop() {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
    },
  },

  slaWatcher: {
    interval: null as NodeJS.Timeout | null,

    start() {
      // TODO: Implement via API endpoint
      console.warn('slaWatcher job disabled - needs API migration');
      this.interval = setInterval(async () => {
        // Disabled - requires API endpoint
      }, 60000);
    },

    stop() {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
    },
  },

  assetLifecycle: {
    interval: null as NodeJS.Timeout | null,

    start() {
      // TODO: Implement via API endpoint
      console.warn('assetLifecycle job disabled - needs API migration');
      this.interval = setInterval(async () => {
        // Disabled - requires API endpoint
      }, 3600000);
    },

    stop() {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
    },
  },

  workflowScheduler: {
    interval: null as NodeJS.Timeout | null,

    start() {
      // TODO: Implement via API endpoint
      console.warn('workflowScheduler job disabled - needs API migration');
      this.interval = setInterval(async () => {
        // Disabled - requires API endpoint
      }, 60000);
    },

    stop() {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
    },
  },

  sessionCleanup: {
    interval: null as NodeJS.Timeout | null,

    start() {
      // TODO: Implement via API endpoint
      console.warn('sessionCleanup job disabled - needs API migration');
      this.interval = setInterval(async () => {
        // Disabled - requires API endpoint
      }, 3600000);
    },

    stop() {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
    },
  },

  telemetryCleanup: {
    interval: null as NodeJS.Timeout | null,

    start() {
      // TODO: Implement via API endpoint
      console.warn('telemetryCleanup job disabled - needs API migration');
      this.interval = setInterval(async () => {
        // Disabled - requires API endpoint
      }, 86400000);
    },

    stop() {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
    },
  },

  startAll() {
    this.complianceWatchdog.start();
    this.slaWatcher.start();
    this.assetLifecycle.start();
    this.workflowScheduler.start();
    this.sessionCleanup.start();
    this.telemetryCleanup.start();
  },

  stopAll() {
    this.complianceWatchdog.stop();
    this.slaWatcher.stop();
    this.assetLifecycle.stop();
    this.workflowScheduler.stop();
    this.sessionCleanup.stop();
    this.telemetryCleanup.stop();
  },
};
