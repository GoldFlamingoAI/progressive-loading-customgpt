// KeepWarm.gs
// A no-op invoked by a time trigger to keep the V8 runtime warm during workout
// hours, so GET/POST avoid multi-second cold starts.
function keepWarm() {
  Logger.log('warm ' + new Date().toISOString());
}
