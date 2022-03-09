import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { Tracer } from "@aws-lambda-powertools/tracer";

const tracer = new Tracer({ serviceName: "lambda-sqs-lambda-xray-poc" })
const sqsClient = tracer.captureAWSv3Client(
  new SQSClient({ region: process.env.QUEUE_REGION }),
);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const payload = JSON.parse(event.body ?? "{}");
  const command = new SendMessageCommand({
    QueueUrl: process.env.QUEUE_URL,
    MessageBody: JSON.stringify(payload, null, 2),
  });

  const response = await sqsClient.send(command);

  return {
    statusCode: 200,
    body: JSON.stringify({ messageId: response.MessageId }),
    headers: {
      "Content-Type": "application/json",
    }
  }
}
