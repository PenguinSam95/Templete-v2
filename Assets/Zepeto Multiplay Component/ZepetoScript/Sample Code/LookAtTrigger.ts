import { Collider, GameObject } from 'UnityEngine';
import { ZepetoPlayers } from 'ZEPETO.Character.Controller';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import LookAt from './LookAt';

export default class LookAtTrigger extends ZepetoScriptBehaviour {

    /* Default Properties */
    private lookAt : LookAt;

    Start() {
        this.lookAt = this.transform.parent.GetComponentInChildren<LookAt>();
    }

    OnTriggerEnter(collider : Collider) {
        if(!ZepetoPlayers.instance.LocalPlayer) return;
        const character = ZepetoPlayers.instance.LocalPlayer.zepetoPlayer.character.gameObject;
        if(collider.gameObject == character) {
            this.lookAt.StartLooking(collider);
        }
    }
    
    OnTriggerExit(collider : Collider) {
        if(!ZepetoPlayers.instance.LocalPlayer) return;
        const character = ZepetoPlayers.instance.LocalPlayer.zepetoPlayer.character.gameObject;
        if(collider.gameObject == character) {
            this.lookAt.StopLooking(collider);
        }

    }
}