import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Shield, AlertCircle, CheckCircle } from "lucide-react";

export default function PaymentGatewaySettings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Stripe Configuration State
  const [stripeConfig, setStripeConfig] = useState({
    enabled: false,
    testMode: true,
    publishableKeyTest: "",
    secretKeyTest: "",
    publishableKeyLive: "",
    secretKeyLive: "",
    webhookEndpointTest: "",
    webhookEndpointLive: "",
    webhookSecretTest: "",
    webhookSecretLive: ""
  });

  // PayPal Configuration State
  const [paypalConfig, setPaypalConfig] = useState({
    enabled: false,
    testMode: true,
    clientIdTest: "",
    clientSecretTest: "",
    clientIdLive: "",
    clientSecretLive: "",
    webhookId: "",
    sandboxAccount: ""
  });

  const handleSaveStripe = async () => {
    setIsSaving(true);
    try {
      // Aquí se guardarían las configuraciones en la base de datos
      // Por ahora solo mostramos un mensaje de éxito
      toast({
        title: "Configuración de Stripe guardada",
        description: "La configuración de Stripe se ha actualizado correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración de Stripe.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePayPal = async () => {
    setIsSaving(true);
    try {
      // Aquí se guardarían las configuraciones en la base de datos
      // Por ahora solo mostramos un mensaje de éxito
      toast({
        title: "Configuración de PayPal guardada",
        description: "La configuración de PayPal se ha actualizado correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración de PayPal.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Configuración de Pasarelas de Pago</h2>
        <p className="text-muted-foreground mt-2">
          Configure las pasarelas de pago para procesar transacciones en su aplicación.
        </p>
      </div>

      {/* Stripe Configuration */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Stripe</CardTitle>
              <CardDescription>
                Configuración de la pasarela de pago Stripe
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={stripeConfig.enabled}
              onCheckedChange={(enabled) => 
                setStripeConfig(prev => ({ ...prev, enabled }))
              }
            />
            <Label>Habilitado</Label>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Environment Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Label>Modo de Prueba</Label>
              <Badge variant={stripeConfig.testMode ? "secondary" : "default"}>
                {stripeConfig.testMode ? "Test" : "Live"}
              </Badge>
            </div>
            <Switch
              checked={stripeConfig.testMode}
              onCheckedChange={(testMode) => 
                setStripeConfig(prev => ({ ...prev, testMode }))
              }
            />
          </div>

          <Separator />

          {/* Test Keys */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-green-600" />
              <h4 className="font-semibold">Claves de Prueba (Test)</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stripe-publishable-test">
                  Publishable Key (Test)
                  <span className="text-xs text-muted-foreground ml-1">pk_test_...</span>
                </Label>
                <Input
                  id="stripe-publishable-test"
                  type="text"
                  placeholder="pk_test_..."
                  value={stripeConfig.publishableKeyTest}
                  onChange={(e) => 
                    setStripeConfig(prev => ({ ...prev, publishableKeyTest: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stripe-secret-test">
                  Secret Key (Test)
                  <span className="text-xs text-muted-foreground ml-1">sk_test_...</span>
                </Label>
                <Input
                  id="stripe-secret-test"
                  type="password"
                  placeholder="sk_test_..."
                  value={stripeConfig.secretKeyTest}
                  onChange={(e) => 
                    setStripeConfig(prev => ({ ...prev, secretKeyTest: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stripe-webhook-test">Webhook Endpoint (Test)</Label>
                <Input
                  id="stripe-webhook-test"
                  type="url"
                  placeholder="https://your-domain.com/webhook/stripe"
                  value={stripeConfig.webhookEndpointTest}
                  onChange={(e) => 
                    setStripeConfig(prev => ({ ...prev, webhookEndpointTest: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stripe-webhook-secret-test">Webhook Secret (Test)</Label>
                <Input
                  id="stripe-webhook-secret-test"
                  type="password"
                  placeholder="whsec_..."
                  value={stripeConfig.webhookSecretTest}
                  onChange={(e) => 
                    setStripeConfig(prev => ({ ...prev, webhookSecretTest: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Live Keys */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <h4 className="font-semibold">Claves de Producción (Live)</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stripe-publishable-live">
                  Publishable Key (Live)
                  <span className="text-xs text-muted-foreground ml-1">pk_live_...</span>
                </Label>
                <Input
                  id="stripe-publishable-live"
                  type="text"
                  placeholder="pk_live_..."
                  value={stripeConfig.publishableKeyLive}
                  onChange={(e) => 
                    setStripeConfig(prev => ({ ...prev, publishableKeyLive: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stripe-secret-live">
                  Secret Key (Live)
                  <span className="text-xs text-muted-foreground ml-1">sk_live_...</span>
                </Label>
                <Input
                  id="stripe-secret-live"
                  type="password"
                  placeholder="sk_live_..."
                  value={stripeConfig.secretKeyLive}
                  onChange={(e) => 
                    setStripeConfig(prev => ({ ...prev, secretKeyLive: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stripe-webhook-live">Webhook Endpoint (Live)</Label>
                <Input
                  id="stripe-webhook-live"
                  type="url"
                  placeholder="https://your-domain.com/webhook/stripe"
                  value={stripeConfig.webhookEndpointLive}
                  onChange={(e) => 
                    setStripeConfig(prev => ({ ...prev, webhookEndpointLive: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stripe-webhook-secret-live">Webhook Secret (Live)</Label>
                <Input
                  id="stripe-webhook-secret-live"
                  type="password"
                  placeholder="whsec_..."
                  value={stripeConfig.webhookSecretLive}
                  onChange={(e) => 
                    setStripeConfig(prev => ({ ...prev, webhookSecretLive: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveStripe} disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar Configuración de Stripe"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PayPal Configuration */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <div className="h-6 w-6 text-blue-600 font-bold flex items-center justify-center text-sm">
                PP
              </div>
            </div>
            <div>
              <CardTitle className="text-xl">PayPal</CardTitle>
              <CardDescription>
                Configuración de la pasarela de pago PayPal
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={paypalConfig.enabled}
              onCheckedChange={(enabled) => 
                setPaypalConfig(prev => ({ ...prev, enabled }))
              }
            />
            <Label>Habilitado</Label>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Environment Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Label>Modo de Prueba (Sandbox)</Label>
              <Badge variant={paypalConfig.testMode ? "secondary" : "default"}>
                {paypalConfig.testMode ? "Sandbox" : "Live"}
              </Badge>
            </div>
            <Switch
              checked={paypalConfig.testMode}
              onCheckedChange={(testMode) => 
                setPaypalConfig(prev => ({ ...prev, testMode }))
              }
            />
          </div>

          <Separator />

          {/* Sandbox Credentials */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-green-600" />
              <h4 className="font-semibold">Credenciales de Sandbox</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paypal-client-id-test">Client ID (Sandbox)</Label>
                <Input
                  id="paypal-client-id-test"
                  type="text"
                  placeholder="AYSq3RDGsmBLJE-otTkBtM-jBRd1TCQwFf9RGfwddNXWz0uFU9ztymylOhRS"
                  value={paypalConfig.clientIdTest}
                  onChange={(e) => 
                    setPaypalConfig(prev => ({ ...prev, clientIdTest: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paypal-client-secret-test">Client Secret (Sandbox)</Label>
                <Input
                  id="paypal-client-secret-test"
                  type="password"
                  placeholder="EGnHDxD_qRPdaLdZz8iCr8N7_MzF-YHPTkjs6NKYQvQSBngp4PTTVWkPZRbL"
                  value={paypalConfig.clientSecretTest}
                  onChange={(e) => 
                    setPaypalConfig(prev => ({ ...prev, clientSecretTest: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="paypal-sandbox-account">Cuenta de Sandbox</Label>
                <Input
                  id="paypal-sandbox-account"
                  type="email"
                  placeholder="sb-test@business.example.com"
                  value={paypalConfig.sandboxAccount}
                  onChange={(e) => 
                    setPaypalConfig(prev => ({ ...prev, sandboxAccount: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Live Credentials */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <h4 className="font-semibold">Credenciales de Producción</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paypal-client-id-live">Client ID (Live)</Label>
                <Input
                  id="paypal-client-id-live"
                  type="text"
                  placeholder="Client ID de producción"
                  value={paypalConfig.clientIdLive}
                  onChange={(e) => 
                    setPaypalConfig(prev => ({ ...prev, clientIdLive: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paypal-client-secret-live">Client Secret (Live)</Label>
                <Input
                  id="paypal-client-secret-live"
                  type="password"
                  placeholder="Client Secret de producción"
                  value={paypalConfig.clientSecretLive}
                  onChange={(e) => 
                    setPaypalConfig(prev => ({ ...prev, clientSecretLive: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="paypal-webhook-id">Webhook ID</Label>
                <Input
                  id="paypal-webhook-id"
                  type="text"
                  placeholder="5WH70883RY375863A"
                  value={paypalConfig.webhookId}
                  onChange={(e) => 
                    setPaypalConfig(prev => ({ ...prev, webhookId: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSavePayPal} disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar Configuración de PayPal"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Información de Stripe</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Publishable Key:</strong> Clave pública que se usa en el frontend</p>
            <p><strong>Secret Key:</strong> Clave secreta que se usa en el backend</p>
            <p><strong>Webhook:</strong> URL para recibir eventos de Stripe</p>
            <p className="text-muted-foreground">
              Las claves de test comienzan con pk_test_ y sk_test_
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <span>Información de PayPal</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Client ID:</strong> Identificador público de la aplicación</p>
            <p><strong>Client Secret:</strong> Clave secreta de la aplicación</p>
            <p><strong>Webhook ID:</strong> ID del webhook para eventos</p>
            <p className="text-muted-foreground">
              Usar sandbox para pruebas y live para producción
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}