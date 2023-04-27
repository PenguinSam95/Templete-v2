import { Collider, GameObject, SpriteRenderer, Transform, WaitForSeconds } from 'UnityEngine';
import { ZepetoPlayers } from 'ZEPETO.Character.Controller';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { ButtonType } from '../Managers/GameManager';

export default class LookAt extends ZepetoScriptBehaviour {

    /* Properties */
    private renderer: SpriteRenderer;
    private collider: Collider;
    private character: GameObject;
    public scriptTarget: Transform;
    public buttonType: ButtonType = ButtonType.NULL;

    Start() {
        this.renderer = this.GetComponent<SpriteRenderer>();
        if(this.renderer) this.renderer.enabled = false;

        this.collider = this.GetComponent<Collider>();
        if(this.collider) this.collider.enabled = false;
    }

    /* Start Look */
    public StartLooking(col : Collider) {
        if(ZepetoPlayers.instance.LocalPlayer == null)
            return;
            
        this.character = ZepetoPlayers.instance.LocalPlayer.zepetoPlayer.character.gameObject;
        if(col.gameObject != this.character)
            return;
        
        if(this.collider) this.collider.enabled = true;
        if(this.renderer) this.renderer.enabled = true;
        this.StartCoroutine(this.LookAtLocalPlayer());
    }
    
    /* Stop Look */
    public StopLooking(col : Collider) {
        if(col.gameObject != this.character)
            return;

        if(this.renderer) this.renderer.enabled = false;
        if(this.collider) this.collider.enabled = false;
        this.StopCoroutine(this.LookAtLocalPlayer());
    }

    /* Look Script */
    private * LookAtLocalPlayer() {
        this.transform.LookAt(ZepetoPlayers.instance.LocalPlayer.zepetoCamera.cameraParent.GetChild(0).transform.position);
        while(true)
        {
            yield new WaitForSeconds(0.1);
            this.transform.LookAt(ZepetoPlayers.instance.LocalPlayer.zepetoCamera.cameraParent.GetChild(0).transform.position);
        }
    }

}