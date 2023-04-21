import { GameObject } from 'UnityEngine';
import { ZepetoPlayers } from 'ZEPETO.Character.Controller';
import { MannequinPreviewer, MannequinInteractable, MannequinComponent, Mannequin } from 'ZEPETO.Mannequin';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'

export default class MannequinManager extends ZepetoScriptBehaviour {

    /* Mannequin */
    // 활성 상태의 아이템만 사용할 수 있음
    // MannequinComponent의 ID에는 CR_을 앞에 추가해야 한다.
    private _previewer: MannequinPreviewer;

    Start() {
        ZepetoPlayers.instance.OnAddedLocalPlayer.AddListener(() => {
            const character = ZepetoPlayers.instance.LocalPlayer.zepetoPlayer.character;
            // Add Mannequin Interactable Component
            character.gameObject.AddComponent<MannequinInteractable>();
        });

        // Find all Mannequin components
        const mannequins = GameObject.FindObjectsOfType<MannequinComponent>();

        mannequins.forEach(m => {
            // Enter the Collider
            m.onActive.AddListener(contents => {
                Mannequin.OpenUI(contents);
                const zepetoContext = ZepetoPlayers.instance.LocalPlayer.zepetoPlayer.character.Context;
                this._previewer = new MannequinPreviewer(zepetoContext, contents);
                this._previewer.PreviewContents();
            });

            // Exit the Collider
            m.onCancel.AddListener(() => {
                Mannequin.CloseUI();
                this._previewer?.ResetContents();
            });
        });
    }

}