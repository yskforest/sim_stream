#!/usr/bin/env python3
"""
External Interface Protocol Validation Script (Python version)
Verifies CTProtocolV1 command envelope, target actions, parameter validations, and gateway response formats.
"""

import sys
from datetime import datetime, timezone

TARGET_ACTIONS = {
    "gantry": {
        "setField": True,
        "setDetectorRows": True,
        "setScanning": True,
        "setXrayVisible": True,
        "setRotorSpeed": True,
        "getState": True,
    },
    "couch": {
        "moveY": True,
        "moveZ": True,
        "getState": True,
    },
    "injector": {
        "setA": True,
        "setB": True,
        "getState": True,
    },
    "simulator": {
        "setPatientVisible": True,
        "setPatientModel": True,
        "loadGlbModel": True,
        "getState": True,
    },
    "camera": {
        "startStream": True,
        "stopStream": True,
        "getStreamUrl": True,
        "getState": True,
    },
}


class CTProtocolV1:
    @staticmethod
    def validate_command(command):
        if not isinstance(command, dict):
            return {"valid": False, "error": {"code": "VALIDATION_ERROR", "message": "Command must be an object."}}

        req_id = command.get("requestId")
        if req_id is not None and not isinstance(req_id, str):
            return {"valid": False, "error": {"code": "VALIDATION_ERROR", "message": "requestId must be a string."}}

        target = command.get("target")
        action = command.get("action")
        if not isinstance(target, str) or not isinstance(action, str):
            return {"valid": False, "error": {"code": "VALIDATION_ERROR", "message": "Command must include string target and action."}}

        if target not in TARGET_ACTIONS:
            return {"valid": False, "error": {"code": "TARGET_NOT_FOUND", "message": "Unknown target."}}

        if not TARGET_ACTIONS[target].get(action):
            return {"valid": False, "error": {"code": "UNSUPPORTED_ACTION", "message": "Action is not supported."}}

        params = command.get("params")
        if params is not None and not isinstance(params, dict):
            return {"valid": False, "error": {"code": "VALIDATION_ERROR", "message": "params must be an object."}}

        p = params or {}
        if target == "couch" and action in ("moveY", "moveZ"):
            if not isinstance(p.get("value"), (int, float)):
                return {"valid": False, "error": {"code": "VALIDATION_ERROR", "message": "params.value must be a number."}}

        if target == "gantry" and action == "setScanning":
            if not isinstance(p.get("value"), bool):
                return {"valid": False, "error": {"code": "VALIDATION_ERROR", "message": "params.value must be a boolean."}}

        if target == "simulator" and action == "setPatientModel":
            if "modelId" in p and not isinstance(p["modelId"], str):
                return {"valid": False, "error": {"code": "VALIDATION_ERROR", "message": "params.modelId must be a string."}}

        if target == "camera" and action == "startStream":
            codec = p.get("codec")
            if codec is not None and codec not in ("h264", "mjpeg"):
                return {"valid": False, "error": {"code": "VALIDATION_ERROR", "message": "Invalid codec."}}
            protocol = p.get("protocol")
            if protocol is not None and protocol not in ("http", "rtsp"):
                return {"valid": False, "error": {"code": "VALIDATION_ERROR", "message": "Invalid protocol."}}
            fps = p.get("fps")
            if fps is not None and not isinstance(fps, (int, float)):
                return {"valid": False, "error": {"code": "VALIDATION_ERROR", "message": "params.fps must be a number."}}

        return {"valid": True, "error": None}

    @staticmethod
    def build_success(request_id, payload):
        return {
            "requestId": request_id,
            "success": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
            "error": None,
        }


def assert_condition(condition, message):
    if not condition:
        print(f"Assertion Error: {message}", file=sys.stderr)
        sys.exit(1)


def main():
    proto = CTProtocolV1

    # 1. Valid command envelope
    v1 = proto.validate_command({
        "requestId": "req-1",
        "target": "gantry",
        "action": "setScanning",
        "params": {"value": True},
    })
    assert_condition(v1["valid"] is True, "Expected valid command")

    # 2. Invalid target
    v2 = proto.validate_command({
        "requestId": "req-2",
        "target": "unknown",
        "action": "setScanning",
        "params": {"value": True},
    })
    assert_condition(v2["valid"] is False, "Expected invalid target")
    assert_condition(v2["error"]["code"] == "TARGET_NOT_FOUND", "Expected TARGET_NOT_FOUND")

    # 3. Invalid parameter
    v3 = proto.validate_command({
        "requestId": "req-3",
        "target": "gantry",
        "action": "setScanning",
        "params": {"value": 1},
    })
    assert_condition(v3["valid"] is False, "Expected invalid param")
    assert_condition(v3["error"]["code"] == "VALIDATION_ERROR", "Expected VALIDATION_ERROR")

    # 4. Camera stream command verification
    v4 = proto.validate_command({
        "requestId": "req-cam-1",
        "target": "camera",
        "action": "startStream",
        "params": {"codec": "h264", "protocol": "rtsp", "fps": 30},
    })
    assert_condition(v4["valid"] is True, "Expected valid camera startStream command")

    # 5. Invalid camera codec
    v5 = proto.validate_command({
        "requestId": "req-cam-2",
        "target": "camera",
        "action": "startStream",
        "params": {"codec": "invalid_codec"},
    })
    assert_condition(v5["valid"] is False, "Expected invalid camera codec")
    assert_condition(v5["error"]["code"] == "VALIDATION_ERROR", "Expected VALIDATION_ERROR for codec")

    # 6. Simulator setPatientModel & gateway payload test
    v6 = proto.validate_command({
        "requestId": "req-glb-1",
        "target": "simulator",
        "action": "setPatientModel",
        "params": {"modelId": "default_patient"},
    })
    assert_condition(v6["valid"] is True, "Expected valid setPatientModel command")

    mock_res = proto.build_success("req-cam-3", {"streamUrl": "http://127.0.0.1:8080/live/ct-camera.mjpg"})
    assert_condition(mock_res["success"] is True, "Expected gateway success")
    assert_condition("streamUrl" in mock_res["payload"], "Expected streamUrl in payload")
    assert_condition("http://" in mock_res["payload"]["streamUrl"], "Expected http stream URL")

    print("External interface protocol validation: OK")
    sys.exit(0)


if __name__ == "__main__":
    main()
