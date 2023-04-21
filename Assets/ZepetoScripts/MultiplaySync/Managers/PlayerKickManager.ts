import { GameObject, Quaternion, Rect, Sprite, Texture, Texture2D, Transform, Vector2, Vector3 } from 'UnityEngine';
import { Button, Image, Text } from 'UnityEngine.UI';
import { Room } from 'ZEPETO.Multiplay';
import { Player } from 'ZEPETO.Multiplay.Schema';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { Users, ZepetoWorldHelper, ZepetoWorldMultiplay } from 'ZEPETO.World';

export default class PlayerKickManager extends ZepetoScriptBehaviour {
    
    public multiplay: ZepetoWorldMultiplay;
    public room: Room;
    public buttonPlayers:Button;
    public buttonPrefabs:Button;
    public playersPanel:GameObject;
    private contents:Transform;
    private buttons:Button[] = [];

    Start() {
        if(!this.multiplay)
            this.multiplay = GameObject.FindObjectOfType<ZepetoWorldMultiplay>();
        
        this.multiplay.RoomJoined += (room: Room) => {
            this.room = room;
        }

        /* Player Kick */
        if(this.buttonPlayers) {
            this.buttonPlayers.onClick.AddListener( () => {
                this.playersPanel.SetActive(!this.playersPanel.activeSelf);
            });
        }

        if(!this.playersPanel)
            return;
        if(!this.buttonPrefabs)
            return;

        this.contents = this.playersPanel.transform.GetChild(0).GetChild(0).transform;
        for(let i=0; i<8; i++) {
            const kickBtn = GameObject.Instantiate(this.buttonPrefabs, Vector3.zero, Quaternion.identity, this.contents) as GameObject;
            kickBtn.gameObject.SetActive(false);
            this.buttons.push(kickBtn.GetComponent<Button>());
        }
        
    }
    
    KickPlayer(userId:string) {
        console.log(` ++++++++++++++++++++++++++++++++++++++++++++++ userId : ${userId} `);
        if(this.room) {
            this.room.Send("Kick", userId);
        }
    }

    public PlayerUpdate(currentPlayers:Map<string, Player>) {
        const ids:string[] = [];
        for(const currentPlayer of currentPlayers.values()) {
            ids.push(currentPlayer.zepetoUserId);
        }
        for(const btn of this.buttons) {
            btn.gameObject.SetActive(false);
            btn.onClick.RemoveAllListeners();
        }

        ZepetoWorldHelper.GetUserInfo(ids, (info: Users[]) => {
            for (let i = 0; i < info.length; i++) {
                console.log(`userId : ${info[i].userOid}, name : ${info[i].name}, zepetoId : ${info[i].zepetoId}`);
                ZepetoWorldHelper.GetProfileTexture(info[i].userOid, (texture:Texture) => {
                    for(const trns of this.buttons[i].GetComponentsInChildren<Transform>()) {
                        switch(trns.name) {
                            case "Text":
                                const text = trns.GetComponent<Text>();
                                text.text = info[i].name;
                                break;
                            case "Image":
                                const image = trns.GetComponent<Image>();
                                let rect: Rect = new Rect(0, 0, texture.width, texture.height);
                                image.sprite = Sprite.Create(texture as Texture2D, rect, new Vector2(0.5, 0.5));
                                break;
                        }
                    }
                    this.buttons[i].gameObject.SetActive(true);
                    this.buttons[i].onClick.AddListener( () => this.KickPlayer(info[i].userOid) );
                }, (error) => {
                    console.log(error);
                });
              }
        }, (error) => {
            console.log(error);
        });
    }

}