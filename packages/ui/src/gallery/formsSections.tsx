import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { FloatingTabBar } from '../components/FloatingTabBar';
import { ListRow } from '../components/ListRow';
import { ScreenHeader } from '../components/ScreenHeader';
import { SecretBox } from '../components/SecretBox';
import { Section } from '../components/Section';
import { Sheet } from '../components/Sheet';
import { Stack } from '../components/Stack';
import { Text } from '../components/Text';
import { TextField } from '../components/TextField';
import { Toast } from '../components/Toast';
import { tabBarLayout } from '../layout/tabBarLayout';
import { useTheme } from '../theme';
import type { GallerySection } from './sections';

// Sheets, forms, copying and toasts, and their sample data.

const noop = () => {};

// How long the gallery pretends something runs (an action, a download, a refresh), or a toast stays
export const DEMO_WAIT_MS = 1500;

const TABS = [
  { key: 'home', icon: 'home', label: 'Home' },
  { key: 'resources', icon: 'layers', label: 'Resources' },
  { key: 'billing', icon: 'chart', label: 'Billing' },
  { key: 'account', icon: 'user', label: 'Account' },
] as const;

// The gallery's sheets never sit under the lock screen; the app builds this with useSheetVisible(open)
const unlocked = (open: boolean) => ({ open, lockCovers: false });

export const FORMS_SECTIONS: readonly GallerySection[] = [
  {
    name: 'Sheet',
    render: function SheetSection() {
      const [server, setServer] = useState(false);
      const [confirming, setConfirming] = useState(false);
      const [rebooting, setRebooting] = useState(false);
      const [form, setForm] = useState(false);
      const [description, setDescription] = useState('');
      // The form, then the new secret in the same sheet
      const [secretStep, setSecretStep] = useState(false);
      const [copied, setCopied] = useState(false);
      const [askingToClose, setAskingToClose] = useState(false);

      const closeForm = () => {
        setForm(false);
        setSecretStep(false);
        setCopied(false);
        setAskingToClose(false);
        setDescription('');
      };

      // Until the secret is copied, the sheet holds open and closing asks first
      const mustAsk = secretStep && !copied;
      const requestClose = () => (mustAsk ? setAskingToClose(true) : closeForm());

      useEffect(() => {
        if (!rebooting) {
          return;
        }

        const done = setTimeout(() => {
          setRebooting(false);
          setConfirming(false);
          setServer(false);
        }, DEMO_WAIT_MS);

        return () => clearTimeout(done);
      }, [rebooting]);

      return (
        <Stack gap="sm">
          <Text variant="subhead" tone="muted">
            A page sheet that slides up over the screen (it fades with Reduce Motion), with its title and a Close button.
            Swipe it down or press Back to close it too.
          </Text>

          <Stack direction="row" gap="xs">
            <Button label="Open a resource" size="sm" fill onPress={() => setServer(true)} />

            <Button label="Open a form" size="sm" fill variant="secondary" onPress={() => setForm(true)} />
          </Stack>

          <Text variant="caption" tone="muted">
            {"Reboot asks first: the question is the sheet's own second step, in the same sheet (iOS can't show a sheet above a sheet). Cancel (or Back on Android) goes back to the resource. The form's next step (the new secret) is the same sheet with a new title; until the secret is copied, the sheet holds open (holdOpen) and closing asks first. In the app, every sheet hides at once while the lock screen covers the app, and its content's own state goes with it: keep it in the component that draws the sheet."}
          </Text>

          <Sheet
            visible={unlocked(server)}
            title="web-prod-1"
            onClose={() => {
              setConfirming(false);
              setServer(false);
            }}
            confirm={
              confirming
                ? {
                    title: 'Reboot web-prod-1?',
                    message: 'It will be unavailable for a minute or two.',
                    confirmLabel: 'Reboot',
                    busy: rebooting,
                    onConfirm: () => setRebooting(true),
                    onCancel: () => setConfirming(false),
                  }
                : null
            }
          >
            <Stack>
              <Section>
                <ListRow title="Status" trailing={{ type: 'status', label: 'Running', health: 'ok' }} />

                <ListRow title="Type" trailing={{ type: 'text', text: 'DEV1-S' }} />
              </Section>

              <Section>
                <ListRow title="Reboot" icon="restart" onPress={() => setConfirming(true)} />
              </Section>
            </Stack>
          </Sheet>

          <Sheet
            visible={unlocked(form)}
            title={secretStep ? 'Copy your secret key now' : 'Create API key'}
            onClose={requestClose}
            holdOpen={mustAsk}
            confirm={
              askingToClose
                ? {
                    title: 'Close without copying?',
                    message: "You won't see this secret again.",
                    confirmLabel: 'Close',
                    onConfirm: closeForm,
                    onCancel: () => setAskingToClose(false),
                  }
                : null
            }
          >
            {secretStep ? (
              <Stack>
                <SecretBox
                  label="Secret key"
                  value="11111111-2222-3333-4444-555555555555"
                  onCopy={() => setCopied(true)}
                />

                <Button label="Done" size="md" onPress={requestClose} />
              </Stack>
            ) : (
              <Stack>
                <TextField
                  label="Description"
                  value={description}
                  placeholder="CI deploy key"
                  onChangeText={setDescription}
                />

                <Button label="Create key" size="md" onPress={() => setSecretStep(true)} />
              </Stack>
            )}
          </Sheet>
        </Stack>
      );
    },
  },
  {
    name: 'ConfirmSheet',
    render: function ConfirmSheetSection() {
      const [open, setOpen] = useState(false);
      const [busy, setBusy] = useState(false);
      // Opened as if the phone went offline while it was up
      const [offline, setOffline] = useState(false);
      // A message taller than the sheet, as at the largest text sizes
      const [long, setLong] = useState(false);

      useEffect(() => {
        if (!busy) {
          return;
        }

        const done = setTimeout(() => {
          setBusy(false);
          setOpen(false);
        }, DEMO_WAIT_MS);

        return () => clearTimeout(done);
      }, [busy]);

      return (
        <Stack gap="sm">
          <Text variant="subhead" tone="muted">
            Asks before an action that stops, restarts, replaces or deletes something. The title names the resource; the
            confirm button says the verb. Opened from the screen; from a sheet, use the Sheet&apos;s second step.
          </Text>

          <Stack direction="row" gap="xs" wrap>
            <Button
              label="Reboot web-prod-1"
              size="sm"
              fill
              variant="secondary"
              onPress={() => {
                setOffline(false);
                setLong(false);
                setOpen(true);
              }}
            />

            <Button
              label="Ask offline"
              size="sm"
              fill
              variant="secondary"
              onPress={() => {
                setOffline(true);
                setLong(false);
                setOpen(true);
              }}
            />

            <Button
              label="Long message"
              size="sm"
              fill
              variant="secondary"
              onPress={() => {
                setOffline(false);
                setLong(true);
                setOpen(true);
              }}
            />
          </Stack>

          <Text variant="caption" tone="muted">
            The question and its message at the top, the two buttons at the bottom of the sheet, above the home
            indicator. Two md buttons sharing the row, Cancel first, the same height. At accessibility text sizes they
            stack, primary first. A message taller than the sheet scrolls, the buttons after it. Reboot shows a spinner
            while it runs, and nothing can be pressed or close the sheet. Offline, Reboot is off and the reason shows
            under the buttons; Cancel still works.
          </Text>

          <ConfirmSheet
            visible={unlocked(open)}
            title="Reboot web-prod-1?"
            message={
              long
                ? 'It will be unavailable for a minute or two, and every request sent to it meanwhile fails. '.repeat(10).trim()
                : 'It will be unavailable for a minute or two.'
            }
            confirmLabel="Reboot"
            busy={busy}
            disabledReason={offline ? "You're offline" : undefined}
            onConfirm={() => setBusy(true)}
            onCancel={() => setOpen(false)}
          />
        </Stack>
      );
    },
  },
  {
    name: 'TextField',
    render: function TextFieldSection() {
      const [name, setName] = useState('');
      const [key, setKey] = useState('ssh-rsa');
      // A field's error shows once the person leaves it, or right after a paste (many characters at once), or when
      // they try to send; never while they type
      const [checked, setChecked] = useState(false);
      const keyError =
        key.trim() === ''
          ? 'Paste your public key.'
          : key.includes(' ')
            ? undefined
            : "This doesn't look like a public SSH key. It should start with ssh-ed25519, ssh-rsa or ecdsa-sha2.";

      return (
        <Stack>
          <TextField label="Name" value={name} placeholder="My laptop" onChangeText={setName} maxLength={64} />

          <TextField
            label="Public key"
            value={key}
            placeholder="ssh-ed25519 AAAA… you@example.com"
            onChangeText={(text) => {
              setChecked(Math.abs(text.length - key.length) > 1);
              setKey(text);
            }}
            onBlur={() => setChecked(true)}
            multiline
            monospace
            autoCapitalize="none"
            error={checked ? keyError : undefined}
          />

          <Button label="Add key" size="md" onPress={() => setChecked(true)} />

          <TextField label="Description" value="CI deploy key" onChangeText={noop} disabled />

          <Text variant="caption" tone="muted">
            The label above, the error below in the danger tone, read out when it appears and heard again on the field.
            Leave the field, paste, or press Add key to see it: never while you type. A grey border at rest, brand while typing.
            multiline: four lines; monospace: the monospace font, no autocorrect. disabled: while the form is sent.
          </Text>
        </Stack>
      );
    },
  },
  {
    name: 'SecretBox',
    render: () => (
      <Stack>
        <SecretBox label="Access key" value="SCWXXXXXXXXXXXXXXXXX" onCopy={noop} />

        <SecretBox label="Secret key" value="11111111-2222-3333-4444-555555555555" onCopy={noop} />

        <SecretBox label="Secret key, app away (hidden)" value="11111111-2222-3333-4444-555555555555" onCopy={noop} hidden />

        <Text variant="caption" tone="muted">
          A secret shown once. Copy says Copied once pressed (screen readers hear it too), and passes the value to the
          screen as sensitive, so the clipboard hides it from Android&apos;s preview. It is never stored or logged, and
          screen readers never read it out: they hear &quot;Hidden. Use Copy to paste it.&quot; hidden: dots, and Copy
          is off, while the app is in the app switcher.
        </Text>
      </Stack>
    ),
  },
  {
    name: 'Toast',
    render: function ToastSection() {
      const { colors, radii } = useTheme();
      const insets = useSafeAreaInsets();
      const [visible, setVisible] = useState(false);

      useEffect(() => {
        if (!visible) {
          return;
        }

        const hide = setTimeout(() => setVisible(false), DEMO_WAIT_MS);

        return () => clearTimeout(hide);
      }, [visible]);

      return (
        <Stack gap="sm">
          <View
            style={[
              styles.phoneBottom,
              { height: tabBarLayout(insets.bottom).clearance + 72, borderColor: colors.divider, borderRadius: radii.lg },
            ]}
          >
            <Toast message="SSH key added" visible={visible} />

            <FloatingTabBar items={TABS} activeKey="account" onSelect={noop} />
          </View>

          <Stack direction="row">
            <Button label="Show the toast" size="sm" variant="secondary" onPress={() => setVisible(true)} />
          </Stack>

          <Text variant="caption" tone="muted">
            {"A short success, above the tab bar. It fades and rises in, then fades out (with Reduce Motion: a plain fade). Screen readers hear it. Taps go through it. Copies don't use it: they say Copied in place, because a toast can't show above a sheet."}
          </Text>
        </Stack>
      );
    },
  },
  {
    name: 'ScreenHeader',
    render: () => (
      <Stack>
        <ScreenHeader title="Account" />

        <ScreenHeader title="SSH keys" onBack={noop} action={{ icon: 'plus', label: 'Add SSH key', onPress: noop }} />

        <Stack gap="xxs">
          <ScreenHeader
            title="API keys"
            onBack={noop}
            action={{ icon: 'plus', label: 'Create API key', onPress: noop, disabled: true }}
          />

          <Text variant="caption" tone="muted" align="end">
            {"You're offline"}
          </Text>
        </Stack>

        <ScreenHeader title="Organization and project settings for Acme International" onBack={noop} />

        <ScreenHeader
          title="web-prod-1"
          onBack={noop}
          action={{ icon: 'star-filled', label: 'Unpin from Home', onPress: noop, selected: true }}
        />

        <ScreenHeader
          title="db-main"
          onBack={noop}
          action={{ icon: 'star', label: 'Pin to Home', onPress: noop, selected: false }}
        />

        <Text variant="caption" tone="muted">
          A tab&apos;s title alone; a pushed screen with Back; an action disabled offline, with its note under it; a long
          title wraps, Back staying by its first line. Back and the action line up with the content&apos;s edges; each is
          44 × 44 to tap and named for screen readers. An on/off action (the pin, selected): the filled star in brand,
          heard as selected, when on; the outline star, muted, when off; its label says what a tap does.
        </Text>
      </Stack>
    ),
  },
];

const styles = StyleSheet.create({
  // The bottom of a phone screen: the tab bar and the toast above it
  phoneBottom: { borderWidth: 1, overflow: 'hidden' },
});
