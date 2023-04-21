import { Collider, Transform, WaitForSeconds } from 'UnityEngine';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import LookAt from './LookAt';

export default class LookAtTrigger extends ZepetoScriptBehaviour {

    private lookAt : LookAt;
    Start() {
        this.lookAt = this.transform.parent.GetComponentInChildren<LookAt>();
    }

    OnTriggerEnter(collider : Collider) {
        this.lookAt.StartLooking(collider);
    }
    
    OnTriggerExit(collider : Collider) {
        this.lookAt.StopLooking(collider);
    }

}