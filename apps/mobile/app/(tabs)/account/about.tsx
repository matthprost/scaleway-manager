import { Button, Card, Screen, ScreenHeader, Stack, Text } from '@scaleway-manager/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { openRepository } from '../../../src/features/account/openRepository';
import { ActionFailed } from '../../../src/features/errors/ActionFailed';

const REPORT_A_PROBLEM = 'How do I report a problem?';

const QUESTIONS = [
  {
    question: 'Is this an official Scaleway app?',
    answer: "No. Scaleway Manager is an independent, open-source app that uses Scaleway's public API.",
  },
  {
    question: 'What happens to my data?',
    answer:
      "The app only talks to Scaleway. It collects no analytics and no crash reports, and it never sees your password: you log in on Scaleway's own page.",
  },
  { question: 'Is it free?', answer: 'Yes. Free, with no ads.' },
  { question: REPORT_A_PROBLEM, answer: 'Open an issue on GitHub.' },
  { question: 'Who made it?', answer: 'Matthias Prost, with help from the open-source community.' },
];

// What people ask about the app, one card per question.
export default function About() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  const openGitHub = async () => {
    setFailed(false);
    try {
      await openRepository();
    } catch {
      setFailed(true);
    }
  };

  return (
    <Screen topInset="belowNotice">
      <Stack>
        <ScreenHeader title="About" onBack={router.back} />

        {QUESTIONS.map(({ question, answer }) => (
          <Card key={question}>
            <Stack gap="xs">
              <Text variant="headline" accessibilityRole="header">
                {question}
              </Text>

              <Text variant="body">{answer}</Text>

              {question === REPORT_A_PROBLEM ? (
                <Stack gap="xs">
                  <Button label="Open GitHub" size="md" variant="secondary" onPress={openGitHub} />

                  {failed ? <ActionFailed /> : null}
                </Stack>
              ) : null}
            </Stack>
          </Card>
        ))}
      </Stack>
    </Screen>
  );
}
