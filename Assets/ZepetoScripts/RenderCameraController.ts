import { Camera } from 'UnityEngine';
import { Button } from 'UnityEngine.UI';
import { UIZepetoPlayerControl, ZepetoPlayers } from 'ZEPETO.Character.Controller';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'

export default class RenderCameraController extends ZepetoScriptBehaviour {

    public renderEditCamera: Camera;
    public renderTextureCamera: Camera;
    public renderButton: Button;
    private renderChange: RenderMode = RenderMode.Default;

    Start() {
        if(this.renderButton) {
            this.renderButton.onClick.AddListener(() => {
                switch(+this.renderChange) {
                    case RenderMode.Default: // to Edit mode
                        ZepetoPlayers.instance.ZepetoCamera.gameObject.SetActive(false);
                        this.renderEditCamera.gameObject.SetActive(true);
                        this.renderChange = RenderMode.Edit_Mode;
                        this.ControllerSet(false);
                        console.log(`Change to Render Edit Mode`);
                        break;

                    case RenderMode.Edit_Mode: // to Image mode
                        ZepetoPlayers.instance.ZepetoCamera.gameObject.SetActive(true);
                        this.renderTextureCamera.gameObject.SetActive(true);
                        this.renderEditCamera.gameObject.SetActive(false);
                        this.renderChange = RenderMode.Image_Mode;
                        this.ControllerSet(false);
                        console.log(`Change to Render Image Mode`);
                        break;

                    case RenderMode.Image_Mode: // to Default
                        ZepetoPlayers.instance.ZepetoCamera.gameObject.SetActive(true);
                        this.renderTextureCamera.gameObject.SetActive(false);
                        this.renderEditCamera.gameObject.SetActive(false);
                        this.renderChange = RenderMode.Default;
                        this.ControllerSet(true);
                        console.log(`Change to Render Default`);
                        break;
                }
            });
        }
    }

    /* Controller Set */
    private ControllerSet(controlable:boolean) {
        const controller = ZepetoPlayers.instance.gameObject.GetComponentInChildren<UIZepetoPlayerControl>();
        if(controlable) {
            controller.gameObject.SetActive(controlable);
        } else {
            controller.gameObject.SetActive(controlable);
        }
    }
}

export enum RenderMode {
    Default, Edit_Mode, Image_Mode,
}