import { Tracer } from "@aws-lambda-powertools/tracer";
import { Context, SQSEvent, SQSRecord } from "aws-lambda";
import { utils, Segment, setSegment } from "aws-xray-sdk";

const tracer = new Tracer({ serviceName: "lambda-sqs-lambda-xray-poc" })
const simulateWork = () => new Promise(res => setTimeout(res, 1000 * Math.random()));

const getLambdaSegmentFromSqsRecord = (
  record: SQSRecord, 
  context: Context
): Segment => {
  const {
    AWSTraceHeader,
    ApproximateFirstReceiveTimestamp,
  } = record.attributes;

  const lambdaStartTime = new Date().getTime() / 1000;
  const sqsEndTime = parseFloat(ApproximateFirstReceiveTimestamp) / 1000;
  const segmentStartTime = lambdaStartTime - (lambdaStartTime - sqsEndTime);
  
  const traceData = utils.processTraceData(AWSTraceHeader);
  const segment = new Segment(context.functionName, traceData.root, traceData.parent);    
  segment.origin = "AWS::Lambda";
  segment.start_time = segmentStartTime;
  segment.addPluginData({
    function_arn: context.invokedFunctionArn,
    region: record.awsRegion,
    request_id: context.awsRequestId,
  });

  return segment;
}

export const handler = async (
  { Records: records }: SQSEvent, 
  context: Context
) => {
  for (const record of records) {
    const segment = getLambdaSegmentFromSqsRecord(record, context);
    setSegment(segment);

    try {
      console.log(JSON.parse(record.body));
      await simulateWork();
    } finally {
      segment.close();
    }
  }
}
