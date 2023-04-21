import { Camera, GameObject, Input, LayerMask, Mathf, Physics, RaycastHit, Vector2, Vector3 } from 'UnityEngine';
import { ZepetoPlayers } from 'ZEPETO.Character.Controller';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { ZepetoWorldMultiplay } from 'ZEPETO.World';
import RenderItemMove from './RenderItemMove';

export default class RenderCaremaManager extends ZepetoScriptBehaviour {

    /* Property */
    private layer_rnd : number;
    private renderCamera : Camera;
    public multiplay : ZepetoWorldMultiplay;

    Start() {
        if(!this.multiplay)
            this.multiplay = GameObject.FindObjectOfType<ZepetoWorldMultiplay>();

        this.layer_rnd = 1 << LayerMask.NameToLayer("Render Item");
    }

    /* Raycasting */
    Update() {
        if (this.multiplay.Room != null && this.multiplay.Room.IsConnected) {
            const hasPlayer = ZepetoPlayers.instance.HasPlayer(this.multiplay.Room.SessionId);
            if (hasPlayer) {
                this.Rendercasting();
            }
        }
    }

    Rendercasting() {
        if(!this.renderCamera) {
            this.renderCamera = this.GetComponent<Camera>();
        }
        if(this.renderCamera && this.renderCamera.gameObject.activeSelf) {
            if(Input.GetMouseButton(0)) {
                const ray = this.renderCamera.ScreenPointToRay(Input.mousePosition);
                const hitInfo = $ref<RaycastHit>();
                if(Physics.SphereCast(ray, 0.5, hitInfo, Mathf.Infinity, this.layer_rnd)) {
                    console.log(`${hitInfo.value.transform.name} ${hitInfo.value.transform.gameObject.layer} ${this.layer_rnd}`);
                    const renderItem = hitInfo.value.transform;
                    renderItem.position = new Vector3(hitInfo.value.point.x, hitInfo.value.point.y, renderItem.position.z);
                }
            }
        }
    }

}