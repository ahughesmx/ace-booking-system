import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePaymentSettings, useUpdatePaymentSettings } from "@/hooks/use-payment-settings";
import { CreditCard, Shield, AlertCircle, CheckCircle, Clock } from "lucide-react";

export default function PaymentGatewaySettings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Payment settings hooks
  const { data: paymentSettings } = usePaymentSettings();
  const updatePaymentSettings = useUpdatePaymentSettings();

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
    webhookUrl: "",
    sandboxAccount: ""
  });

  // Mercado Pago Configuration State
  const [mercadoPagoConfig, setMercadoPagoConfig] = useState({
    enabled: false,
    testMode: true,
    publicKeyTest: "",
    accessTokenTest: "",
    publicKeyLive: "",
    accessTokenLive: "",
    clientIdTest: "",
    clientSecretTest: "",
    clientIdLive: "",
    clientSecretLive: "",
    webhookUrl: ""
  });

  // Cargar configuraciones existentes
  useEffect(() => {
    const loadConfigurations = async () => {
      try {
        const { data: gateways, error } = await supabase
          .from("payment_gateways")
          .select("*");

        if (error) throw error;

        gateways?.forEach(gateway => {
          const config = gateway.configuration as any;
          if (gateway.name === 'stripe') {
            setStripeConfig({
              enabled: gateway.enabled,
              testMode: gateway.test_mode,
              publishableKeyTest: config?.publishableKeyTest || "",
              secretKeyTest: config?.secretKeyTest || "",
              publishableKeyLive: config?.publishableKeyLive || "",
              secretKeyLive: config?.secretKeyLive || "",
              webhookEndpointTest: config?.webhookEndpointTest || "",
              webhookEndpointLive: config?.webhookEndpointLive || "",
              webhookSecretTest: config?.webhookSecretTest || "",
              webhookSecretLive: config?.webhookSecretLive || ""
            });
          } else if (gateway.name === 'paypal') {
            setPaypalConfig({
              enabled: gateway.enabled,
              testMode: gateway.test_mode,
              clientIdTest: config?.clientIdTest || "",
              clientSecretTest: config?.clientSecretTest || "",
              clientIdLive: config?.clientIdLive || "",
              clientSecretLive: config?.clientSecretLive || "",
              webhookId: config?.webhookId || "",
              webhookUrl: config?.webhookUrl || "",
              sandboxAccount: config?.sandboxAccount || ""
            });
          } else if (gateway.name === 'mercadopago') {
            setMercadoPagoConfig({
              enabled: gateway.enabled,
              testMode: gateway.test_mode,
              publicKeyTest: config?.publicKeyTest || "",
              accessTokenTest: config?.accessTokenTest || "",
              publicKeyLive: config?.publicKeyLive || "",
              accessTokenLive: config?.accessTokenLive || "",
              clientIdTest: config?.clientIdTest || "",
              clientSecretTest: config?.clientSecretTest || "",
              clientIdLive: config?.clientIdLive || "",
              clientSecretLive: config?.clientSecretLive || "",
              webhookUrl: config?.webhookUrl || ""
            });
          }
        });
      } catch (error) {
        console.error("Error loading payment configurations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfigurations();
  }, []);

  const handleSaveStripe = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("payment_gateways")
        .update({
          enabled: stripeConfig.enabled,
          test_mode: stripeConfig.testMode,
          configuration: {
            publishableKeyTest: stripeConfig.publishableKeyTest,
            secretKeyTest: stripeConfig.secretKeyTest,
            publishableKeyLive: stripeConfig.publishableKeyLive,
            secretKeyLive: stripeConfig.secretKeyLive,
            webhookEndpointTest: stripeConfig.webhookEndpointTest,
            webhookEndpointLive: stripeConfig.webhookEndpointLive,
            webhookSecretTest: stripeConfig.webhookSecretTest,
            webhookSecretLive: stripeConfig.webhookSecretLive
          }
        })
        .eq("name", "stripe");

      if (error) throw error;

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
      const { error } = await supabase
        .from("payment_gateways")
        .update({
          enabled: paypalConfig.enabled,
          test_mode: paypalConfig.testMode,
          configuration: {
            clientIdTest: paypalConfig.clientIdTest,
            clientSecretTest: paypalConfig.clientSecretTest,
            clientIdLive: paypalConfig.clientIdLive,
            clientSecretLive: paypalConfig.clientSecretLive,
            webhookId: paypalConfig.webhookId,
            webhookUrl: paypalConfig.webhookUrl,
            sandboxAccount: paypalConfig.sandboxAccount
          }
        })
        .eq("name", "paypal");

      if (error) throw error;

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

  const handleSaveMercadoPago = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("payment_gateways")
        .update({
          enabled: mercadoPagoConfig.enabled,
          test_mode: mercadoPagoConfig.testMode,
          configuration: {
            publicKeyTest: mercadoPagoConfig.publicKeyTest,
            accessTokenTest: mercadoPagoConfig.accessTokenTest,
            publicKeyLive: mercadoPagoConfig.publicKeyLive,
            accessTokenLive: mercadoPagoConfig.accessTokenLive,
            clientIdTest: mercadoPagoConfig.clientIdTest,
            clientSecretTest: mercadoPagoConfig.clientSecretTest,
            clientIdLive: mercadoPagoConfig.clientIdLive,
            clientSecretLive: mercadoPagoConfig.clientSecretLive,
            webhookUrl: mercadoPagoConfig.webhookUrl
          }
        })
        .eq("name", "mercadopago");

      if (error) throw error;

      toast({
        title: "Configuración de Mercado Pago guardada",
        description: "La configuración de Mercado Pago se ha actualizado correctamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración de Mercado Pago.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTimeout = async (newTimeout: number) => {
    if (!paymentSettings?.id) return;
    
    try {
      await updatePaymentSettings.mutateAsync({
        id: paymentSettings.id,
        payment_timeout_minutes: newTimeout
      });
    } catch (error) {
      console.error("Error updating payment timeout:", error);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Configuración de Pagos</h2>
        <p className="text-muted-foreground mt-2">
          Configure las pasarelas de pago y opciones generales para procesar transacciones.
        </p>
      </div>

      {/* Payment General Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-xl">Configuración General</CardTitle>
              <CardDescription>
                Configuraciones generales del sistema de pagos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment-timeout">
              Tiempo de espera para completar el pago (minutos)
            </Label>
            <div className="flex items-center space-x-2">
              <Input
                id="payment-timeout"
                type="number"
                min="1"
                max="60"
                value={paymentSettings?.payment_timeout_minutes || 10}
                onChange={(e) => {
                  const newValue = parseInt(e.target.value);
                  if (newValue >= 1 && newValue <= 60) {
                    handleUpdateTimeout(newValue);
                  }
                }}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                minutos (actualmente: {paymentSettings?.payment_timeout_minutes || 10} min)
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Tiempo máximo que tiene un usuario para completar el pago después de confirmar una reserva.
            </p>
          </div>
        </CardContent>
      </Card>

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
              <div className="space-y-2">
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
              <div className="space-y-2">
                <Label htmlFor="paypal-webhook-url">Webhook URL</Label>
                <Input
                  id="paypal-webhook-url"
                  type="url"
                  placeholder="https://your-domain.com/webhook/paypal"
                  value={paypalConfig.webhookUrl}
                  onChange={(e) => 
                    setPaypalConfig(prev => ({ ...prev, webhookUrl: e.target.value }))
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

      {/* Mercado Pago Configuration */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <div className="h-6 w-6 text-white font-bold flex items-center justify-center text-sm">
                MP
              </div>
            </div>
            <div>
              <CardTitle className="text-xl">Mercado Pago</CardTitle>
              <CardDescription>
                Configuración de la pasarela de pago Mercado Pago
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={mercadoPagoConfig.enabled}
              onCheckedChange={(enabled) => 
                setMercadoPagoConfig(prev => ({ ...prev, enabled }))
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
              <Badge variant={mercadoPagoConfig.testMode ? "secondary" : "default"}>
                {mercadoPagoConfig.testMode ? "Test" : "Live"}
              </Badge>
            </div>
            <Switch
              checked={mercadoPagoConfig.testMode}
              onCheckedChange={(testMode) => 
                setMercadoPagoConfig(prev => ({ ...prev, testMode }))
              }
            />
          </div>

          <Separator />

          {/* Test Credentials */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-green-600" />
              <h4 className="font-semibold">Credenciales de Prueba (Test)</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mp-public-key-test">
                  Public Key (Test)
                  <span className="text-xs text-muted-foreground ml-1">TEST-...</span>
                </Label>
                <Input
                  id="mp-public-key-test"
                  type="text"
                  placeholder="TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={mercadoPagoConfig.publicKeyTest}
                  onChange={(e) => 
                    setMercadoPagoConfig(prev => ({ ...prev, publicKeyTest: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mp-access-token-test">
                  Access Token (Test)
                  <span className="text-xs text-muted-foreground ml-1">TEST-...</span>
                </Label>
                <Input
                  id="mp-access-token-test"
                  type="password"
                  placeholder="TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={mercadoPagoConfig.accessTokenTest}
                  onChange={(e) => 
                    setMercadoPagoConfig(prev => ({ ...prev, accessTokenTest: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mp-client-id-test">Client ID (Test)</Label>
                <Input
                  id="mp-client-id-test"
                  type="text"
                  placeholder="1234567890123456"
                  value={mercadoPagoConfig.clientIdTest}
                  onChange={(e) => 
                    setMercadoPagoConfig(prev => ({ ...prev, clientIdTest: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mp-client-secret-test">Client Secret (Test)</Label>
                <Input
                  id="mp-client-secret-test"
                  type="password"
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={mercadoPagoConfig.clientSecretTest}
                  onChange={(e) => 
                    setMercadoPagoConfig(prev => ({ ...prev, clientSecretTest: e.target.value }))
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
              <h4 className="font-semibold">Credenciales de Producción (Live)</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mp-public-key-live">
                  Public Key (Live)
                  <span className="text-xs text-muted-foreground ml-1">APP_USR-...</span>
                </Label>
                <Input
                  id="mp-public-key-live"
                  type="text"
                  placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={mercadoPagoConfig.publicKeyLive}
                  onChange={(e) => 
                    setMercadoPagoConfig(prev => ({ ...prev, publicKeyLive: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mp-access-token-live">
                  Access Token (Live)
                  <span className="text-xs text-muted-foreground ml-1">APP_USR-...</span>
                </Label>
                <Input
                  id="mp-access-token-live"
                  type="password"
                  placeholder="APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={mercadoPagoConfig.accessTokenLive}
                  onChange={(e) => 
                    setMercadoPagoConfig(prev => ({ ...prev, accessTokenLive: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mp-client-id-live">Client ID (Live)</Label>
                <Input
                  id="mp-client-id-live"
                  type="text"
                  placeholder="1234567890123456"
                  value={mercadoPagoConfig.clientIdLive}
                  onChange={(e) => 
                    setMercadoPagoConfig(prev => ({ ...prev, clientIdLive: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mp-client-secret-live">Client Secret (Live)</Label>
                <Input
                  id="mp-client-secret-live"
                  type="password"
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={mercadoPagoConfig.clientSecretLive}
                  onChange={(e) => 
                    setMercadoPagoConfig(prev => ({ ...prev, clientSecretLive: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="mp-webhook-url">Webhook URL</Label>
                <Input
                  id="mp-webhook-url"
                  type="url"
                  placeholder="https://your-domain.com/webhook/mercadopago"
                  value={mercadoPagoConfig.webhookUrl}
                  onChange={(e) => 
                    setMercadoPagoConfig(prev => ({ ...prev, webhookUrl: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveMercadoPago} disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar Configuración de Mercado Pago"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              <span>Información de Mercado Pago</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Public Key:</strong> Clave pública para el frontend</p>
            <p><strong>Access Token:</strong> Clave privada para el backend</p>
            <p><strong>Client ID/Secret:</strong> Para integraciones OAuth</p>
            <p className="text-muted-foreground">
              Test: TEST-... | Live: APP_USR-...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}