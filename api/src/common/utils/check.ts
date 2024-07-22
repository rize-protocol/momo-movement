import { BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';

export function checkBadRequest(assertResult: boolean, errMsg: string) {
  if (!assertResult) {
    throw new BadRequestException(errMsg);
  }
}

export function checkBadGateway(assertResult: boolean, errMsg: string) {
  if (!assertResult) {
    throw new BadRequestException(errMsg);
  }
}

export function checkEntityManager(entityManager: EntityManager) {
  if (!entityManager) {
    throw new Error('entityManager is required');
  }
}
