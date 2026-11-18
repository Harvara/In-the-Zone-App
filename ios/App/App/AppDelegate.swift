import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}

// Cross-platform access storage; Android owns the first background runtime.
// Kept in this source file so the generated Xcode target includes it without extra project references.
import Security

@objc(GameBridgeViewController)
class GameBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() { bridge?.registerPluginInstance(GameRuntimePlugin()) }
}

@objc(GameRuntimePlugin)
public class GameRuntimePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GameRuntimePlugin"
    public let jsName = "GameRuntime"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "load", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "save", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise)
    ]
    private var query: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: "de.manhunt.game",
         kSecAttrAccount as String: "participant"]
    }
    @objc func load(_ call: CAPPluginCall) {
        var request = query
        request[kSecReturnData as String] = true
        request[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(request as CFDictionary, &result)
        if status == errSecItemNotFound { call.resolve([:]); return }
        guard status == errSecSuccess, let data = result as? Data,
              let credentials = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            call.reject("Der gespeicherte Zugang ist nicht verfügbar."); return
        }
        call.resolve(["credentials": credentials])
    }
    @objc func save(_ call: CAPPluginCall) {
        let credentials = ["server": call.getString("server") ?? "", "token": call.getString("token") ?? "",
                           "participantId": call.getString("participantId") ?? "", "sessionId": call.getString("sessionId") ?? ""]
        guard let url = URL(string: credentials["server"] ?? ""), url.scheme == "https",
              let data = try? JSONSerialization.data(withJSONObject: credentials) else {
            call.reject("Für iOS bitte einen HTTPS-Server verwenden."); return
        }
        var item = query
        item[kSecValueData as String] = data
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let status = SecItemUpdate(query as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        if status == errSecItemNotFound {
            guard SecItemAdd(item as CFDictionary, nil) == errSecSuccess else { call.reject("Zugang konnte nicht gespeichert werden."); return }
        } else if status != errSecSuccess { call.reject("Zugang konnte nicht gespeichert werden."); return }
        call.resolve()
    }
    @objc func clear(_ call: CAPPluginCall) {
        let status = SecItemDelete(query as CFDictionary)
        if status != errSecSuccess && status != errSecItemNotFound { call.reject("Zugang konnte nicht entfernt werden."); return }
        call.resolve()
    }
    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: UIApplication.openSettingsURLString) else { call.reject("Einstellungen nicht verfügbar."); return }
            UIApplication.shared.open(url, options: [:]) { opened in
                if opened { call.resolve() } else { call.reject("Einstellungen konnten nicht geöffnet werden.") }
            }
        }
    }
}
