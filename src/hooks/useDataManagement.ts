import { useState } from 'react';
import { BusinessRule } from '../components/RuleBuilder';
import { PriorityWeight } from '../components/PriorityWeights';

type EntityType = 'client' | 'worker' | 'task';

interface AppData {
    clients: any[];
    workers: any[];
    tasks: any[];
}

export const useDataManagement = () => {
    const [appData, setAppData] = useState<AppData>({ clients: [], workers: [], tasks: [] });
    const [activeTab, setActiveTab] = useState<EntityType | 'rules' | 'priorities' | 'export'>('client');

    // Milestone 2 - Business Rules & Configuration
    const [businessRules, setBusinessRules] = useState<BusinessRule[]>([]);
    const [priorityWeights, setPriorityWeights] = useState<PriorityWeight[]>([]);

    const updateData = (newData: AppData) => {
        setAppData(newData);
    };

    const handleDataChange = (entityType: EntityType, updatedData: any[], immediate: boolean = false) => {
        const newData = {
            ...appData,
            [`${entityType}s`]: updatedData
        };
        setAppData(newData);
        return newData;
    };

    const getCurrentEntityData = (entityType: EntityType): any[] => {
        switch (entityType) {
            case 'client':
                return appData.clients;
            case 'worker':
                return appData.workers;
            case 'task':
                return appData.tasks;
            default:
                return [];
        }
    };

    const getTotalRecords = (): number => {
        return appData.clients.length + appData.workers.length + appData.tasks.length;
    };

    const hasData = (): boolean => {
        return getTotalRecords() > 0;
    };

    const getEntityCounts = () => {
        return {
            clients: appData.clients.length,
            workers: appData.workers.length,
            tasks: appData.tasks.length,
            total: getTotalRecords()
        };
    };

    return {
        // Data state
        appData,
        activeTab,
        setActiveTab,
        businessRules,
        setBusinessRules,
        priorityWeights,
        setPriorityWeights,
        
        // Data operations
        updateData,
        handleDataChange,
        getCurrentEntityData,
        getTotalRecords,
        hasData,
        getEntityCounts
    };
}; 