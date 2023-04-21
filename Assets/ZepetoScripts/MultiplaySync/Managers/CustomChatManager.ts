import { Color, GameObject } from 'UnityEngine';
import { Button, InputField, Text } from 'UnityEngine.UI';
import { UserMessage, ZepetoChat } from 'ZEPETO.Chat';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'

export default class CustomChatManager extends ZepetoScriptBehaviour {

    public customChatPanel: GameObject;
    public customChatButton: Button;
    public customChatBtns: Button[] = [];
    public sendChatBtn: Button;
    public resultText: Text;
    public inputChatbox: InputField;
    public chatOnOffButton: Button;

    private onOffer = true;

    Start() {
        // When Button click
        for(const btn of this.customChatBtns) {
            btn.onClick.AddListener(() => {
                const names = btn.name.split("_");
                ZepetoChat.Send(names[names.length-1]);
            });
        }
        this.sendChatBtn.onClick.AddListener(() => {
            this.resultText.color = Color.black;
            const inputMsg = this.inputChatbox.text;
            ZepetoChat.Send(inputMsg);
            this.inputChatbox.text = "";
        });

        this.customChatButton.onClick.AddListener(() => {
            this.customChatPanel.SetActive(!this.customChatPanel.activeSelf);
            this.resultText.text = "";
        });

        this.chatOnOffButton.onClick.AddListener(() => {
            this.onOffer = !this.onOffer;
            ZepetoChat.SetActiveChatUI(this.onOffer);
        });

        // Receive message
        ZepetoChat.OnReceivedMessage.AddListener(msg => {
            const userMsg = msg as UserMessage;
            // this.resultText.text = `[USER - ${userMsg.userName}] - ${userMsg.message}`;
            if(userMsg.isFiltered) {
                this.resultText.text = `???`;
            } else {
                this.resultText.text = `${userMsg.message}`;
            }
        });
    }

}