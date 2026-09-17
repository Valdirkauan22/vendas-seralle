import { Capacitor } from "@capacitor/core";
import { PushNotifications, Token, ActionPerformed } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";

let isPushInitialized = false;

/**
 * Cria os canais de notificação nativos do Android com alta prioridade
 */
export async function setupAndroidNotificationChannels(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Cria o canal principal no PushNotifications
    await PushNotifications.createChannel({
      id: "seralle_lembretes",
      name: "Lembretes Serallê Calçados",
      description: "Alertas de metas, fechamento de caixa e ritmo de vendas",
      importance: 5, // Importância Máxima (Alerta com som e pop-up)
      visibility: 1,
      vibration: true,
      sound: "beep.wav",
    });

    // Cria o canal no LocalNotifications
    await LocalNotifications.createChannel({
      id: "seralle_lembretes",
      name: "Lembretes Serallê Calçados",
      description: "Alertas de metas, fechamento de caixa e ritmo de vendas",
      importance: 5,
      visibility: 1,
      vibration: true,
      sound: "beep.wav",
    });
  } catch (err) {
    console.warn("Aviso ao criar canais de notificação Android:", err);
  }
}

/**
 * Registra o dispositivo no Firebase Cloud Messaging (Push Notifications)
 * e salva o token FCM no Firestore do usuário autenticado.
 */
export async function initializeNativePushNotifications(userId?: string | null): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    await setupAndroidNotificationChannels();

    // Solicita permissão nativa do Android (Android 13+ Tiramisu POST_NOTIFICATIONS)
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === "prompt") {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== "granted") {
      console.warn("Permissão de Push Notifications não concedida:", permStatus.receive);
      return false;
    }

    if (!isPushInitialized) {
      isPushInitialized = true;

      // Listener de Registro do Token FCM
      await PushNotifications.addListener("registration", async (token: Token) => {
        console.log("✅ Token FCM registrado com sucesso:", token.value);
        localStorage.setItem("@seralle:fcm_token", token.value);

        if (userId) {
          try {
            await setDoc(
              doc(db, "users", userId),
              {
                fcmToken: token.value,
                platform: "android",
                fcmUpdatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
            console.log("✅ Token FCM sincronizado no Firestore para usuário:", userId);
          } catch (e) {
            console.warn("Erro ao salvar token FCM no Firestore:", e);
          }
        }
      });

      // Erro no registro
      await PushNotifications.addListener("registrationError", (error: any) => {
        console.error("❌ Erro ao registrar Push Notifications:", error);
      });

      // Notificação recebida com o app em primeiro plano
      await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("🔔 Notificação Push recebida no app:", notification);
        window.dispatchEvent(
          new CustomEvent("seralle-notification", {
            detail: {
              title: notification.title || "Diário Serallê",
              body: notification.body || "",
              type: "geral",
            },
          })
        );
      });

      // Notificação clicada pelo usuário na barra do Android
      await PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (notification: ActionPerformed) => {
          console.log("👆 Notificação clicada:", notification);
        }
      );
    }

    // Registra no FCM nativo
    await PushNotifications.register();
    return true;
  } catch (err) {
    console.error("Erro ao inicializar Push Notifications nativo:", err);
    return false;
  }
}

/**
 * Dispara uma notificação local instantânea nativa no Android via Capacitor
 */
export async function sendCapacitorLocalNotification(
  title: string,
  body: string,
  id: number = Date.now() % 100000
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== "granted") return false;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title,
          body,
          channelId: "seralle_lembretes",
          schedule: { at: new Date(Date.now() + 500) }, // disparo quase imediato
          sound: "beep.wav",
        },
      ],
    });
    return true;
  } catch (e) {
    console.warn("Erro ao enviar notificação local via Capacitor:", e);
    return false;
  }
}
