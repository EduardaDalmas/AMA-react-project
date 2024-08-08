import { useParams } from "react-router-dom";
import { Message } from "./message";
import { getRoomMessages, GetRoomMessagesResponse } from "../http/get-room-messages";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export function Messages () {
  const queryClient = useQueryClient()
  const { roomId } = useParams()

  if (!roomId) {
    throw new Error('Componente de Mensagens devem ser usados ​​na página da sala')
  }

  const { data } = useSuspenseQuery({
    queryKey: ['messages', roomId],
    queryFn: () => getRoomMessages({ roomId }),
  })

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8080/subscribe/${roomId}`)

    ws.onopen = () => {
      console.log('Websocket connected')
    }

    ws.onclose = () => {
      console.log('Websocket connection closed')
    }

    ws.onmessage = (event) => {
      const data: {
        kind: 'message_created' | 'message_answered' | 'message_reaction_increased' | 'message_reaction_decreased',
        value: any
      } = JSON.parse(event.data)

      switch (data.kind) {
        case 'message_created': 
          queryClient.setQueryData<GetRoomMessagesResponse>(['messages', roomId], state => {
            return {
              messages: [
                ...(state?.messages ?? []),
                {
                  id: data.value.id,
                  text: data.value.message,
                  amountOfReactions: 0,
                  answered: false,
                }
              ]
            }
          })
          break
        case 'message_answered':
          queryClient.setQueryData<GetRoomMessagesResponse>(['messages', roomId], state => {
            if (!state) {
              return undefined
            }

            return {
              messages: state.messages.map(message => {
                if (message.id === data.value.id) {
                  return {
                    ...message,
                    answered: true,
                  }
                } else {
                  return message
                }

                return message
              }),
            }
          })
          break
          case 'message_reaction_increased':
          case 'message_reaction_decreased':
            queryClient.setQueryData<GetRoomMessagesResponse>(['messages', roomId], state => {
              if (!state) {
                return undefined
              }
  
              return {
                messages: state.messages.map(item => {
                  if (item.id === data.value.id) {
                    return { ...item, amountOfReactions: data.value.count }
                  }
  
                  return item
                }),
              }
            })

            break;
        }
      }

    return () => {
      ws.close()
    }
  }, [roomId, queryClient])

  return (
      <ol className="list-decimal list-outside px-3 space-y-8">
        {data.messages.map(message => {
          return (
            <Message 
              key={message.id}
              id={message.id}
              text={message.text}
              amountOfReactions={message.amountOfReactions} 
              answered={message.answered} 
            />
          )
        })}
      </ol>
  ) 
}