import { GameObject, Quaternion, Vector2, Vector3 } from 'UnityEngine';
import { Button, Text } from 'UnityEngine.UI';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { QuickMessage, WorldMultiplayChatContent, ZepetoWorldContent } from 'ZEPETO.World';

export default class QuickChatManager extends ZepetoScriptBehaviour {

    public quickChatBtn:Button;
    public quickChatPanel:GameObject;
    public quickChatClone:GameObject;

    Start() {
        ZepetoWorldContent.GetQuickMessageList(quickMessageList => {
            quickMessageList.forEach((quickMessage: QuickMessage, index: number, array: QuickMessage[]) => {
                if(quickMessage.id == "zw_quickchat_preset_001") {
                    quickMessage.message = "메타버즈"
                } else if(quickMessage.id == "zw_quickchat_preset_002") {
                    quickMessage.message = "metabuzz"
                } else if(quickMessage.id == "zw_quickchat_preset_003") {
                    quickMessage.message = "테스트 123 test"
                }

                const clone = GameObject.Instantiate(this.quickChatClone, Vector3.zero, Quaternion.identity, this.quickChatPanel.transform.GetChild(0).GetChild(0)) as GameObject;
                const btn = clone.GetComponent<Button>();
                const text = btn.gameObject.GetComponentInChildren<Text>();
                text.text = quickMessage.message;
                btn.onClick.AddListener(() => {
                    console.log(` ++++++++++++++++++++++++++++++++++++ quickMessage.id ${quickMessage.id} `);
                    console.log(` ++++++++++++++++++++++++++++++++++++ quickMessage.message ${quickMessage.message} `);
                    this.OnClickQuickMessageButton(quickMessage.id);
                });
            });
        }, err => {
            console.log(`QuickMessage Error: ${err}`);
        });

        // Send "Hi" message
        this.quickChatBtn.onClick.AddListener(() => {
            this.quickChatPanel.SetActive(!this.quickChatPanel.activeSelf);
        });
    }

    private OnClickQuickMessageButton(quickId: string) {
        WorldMultiplayChatContent.instance.SendQuickMessage(quickId);
    }

}