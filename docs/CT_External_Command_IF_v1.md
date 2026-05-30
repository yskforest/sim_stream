# CT Simulator External Command Interface v1

- Spec ID: CTSIM-IF-001
- Version: 1.0
- Date: 2026-05-30
- Runtime API: `window.CTExternalGateway`

## 1. Overview
This interface allows an external console app to control virtual HW targets (`gantry`, `couch`, `injector`) and query simulator state.

## 2. Public API
- `CTExternalGateway.send(command)`
- `CTExternalGateway.getState()`
- `CTExternalGateway.subscribe(onStateChange)`

## 3. Command Schema
```json
{
  "requestId": "optional-string",
  "target": "gantry | couch | injector | simulator",
  "action": "action-name",
  "params": {}
}
```

## 4. Response Schema
```json
{
  "requestId": "string|null",
  "success": true,
  "timestamp": "ISO-8601",
  "payload": {},
  "error": null
}
```

Error response:
```json
{
  "requestId": "string|null",
  "success": false,
  "timestamp": "ISO-8601",
  "payload": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "..."
  }
}
```

## 5. Supported Targets/Actions
### gantry
- `setField` (`params.key`, `params.value`)
- `setDetectorRows` (`params.value:number`)
- `setScanning` (`params.value:boolean`)
- `setXrayVisible` (`params.value:boolean`)
- `setRotorSpeed` (`params.value:number`)
- `getState`

### couch
- `moveY` (`params.value:number`)
- `moveZ` (`params.value:number`)
- `getState`

### injector
- `setA` (`params.value:number`)
- `setB` (`params.value:number`)
- `getState`

### simulator
- `setPatientVisible` (`params.value:boolean`)
- `getState`

## 6. Error Codes
- `VALIDATION_ERROR`
- `TARGET_NOT_FOUND`
- `UNSUPPORTED_ACTION`
- `INTERNAL_ERROR`

## 7. Subscription
`subscribe` receives normalized success envelopes on each state change.

Example:
```js
const unsubscribe = window.CTExternalGateway.subscribe((event) => {
  console.log(event.success, event.payload);
});
```

## 8. Examples
### Start scan
```js
window.CTExternalGateway.send({
  requestId: 'req-001',
  target: 'gantry',
  action: 'setScanning',
  params: { value: true }
});
```

### Move couch
```js
window.CTExternalGateway.send({
  requestId: 'req-002',
  target: 'couch',
  action: 'moveZ',
  params: { value: 65 }
});
```

### Query full state
```js
window.CTExternalGateway.getState();
```
