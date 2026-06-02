import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'af-south-1',
});

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export const TABLE_NAME = process.env.TABLE_NAME || 'SwapSmart-dev';
export const LEDGER_TABLE_NAME = process.env.LEDGER_TABLE_NAME || 'SwapSmart_Ledger-dev';
