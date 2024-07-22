import {
  CloudWatchClient,
  PutMetricDataCommand,
  StandardUnit,
  Dimension,
  PutMetricDataInput,
} from '@aws-sdk/client-cloudwatch';
import { MetricDatum } from '@aws-sdk/client-cloudwatch/dist-types/models/models_0';
import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MonitoringConfig } from '@/common/config/types';

@Injectable()
export class MetricsService {
  private readonly namespace: string;

  private readonly env: string;

  private cloudWatchClient: CloudWatchClient;

  private logger: Logger = new Logger(MetricsService.name);

  constructor(private readonly configService: ConfigService) {
    const rawConfig = this.configService.get<MonitoringConfig>('monitoring');
    if (!rawConfig) {
      throw new BadGatewayException('monitoring config not found');
    }

    this.namespace = rawConfig.metricsNamespace;
    this.cloudWatchClient = new CloudWatchClient({ region: rawConfig.region });
    this.env = rawConfig.env;
  }

  async putMetrics(metricData: MetricDatum[]) {
    const params: PutMetricDataInput = { Namespace: this.namespace, MetricData: metricData };
    const cmd = new PutMetricDataCommand(params);
    try {
      await this.cloudWatchClient.send(cmd);
    } catch (e) {
      this.logger.error(`push metrics error: ${e}`);
    }
  }

  createMetricData(metricName: string, value: number, unit: StandardUnit, dimensions?: Dimension[]): MetricDatum {
    const envDimension: Dimension = { Name: 'Env', Value: this.env };
    const updatedDimensions = dimensions ? [...dimensions, envDimension] : [envDimension];

    return {
      MetricName: metricName,
      Dimensions: updatedDimensions,
      Value: value,
      Unit: unit,
    };
  }
}
