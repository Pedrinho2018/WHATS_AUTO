import managementService from '../../../services';
import { Contact, Company } from '../../../models';

jest.mock('../../../models');

describe('ManagementService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('contacts', () => {
    describe('create', () => {
      it('deve criar novo contato com sucesso', async () => {
        const contactData = {
          name: 'João Silva',
          phone: '5566989898989',
          email: 'joao@email.com',
          company: 'Empresa Teste',
          tenantId: 'tenant-1',
        };

        const contact = {
          id: 'contact-1',
          ...contactData,
          createdAt: new Date(),
        };

        (Contact.create as jest.Mock).mockResolvedValue(contact);

        const result = await managementService.contacts.create(contactData);

        expect(Contact.create).toHaveBeenCalledWith(contactData);
        expect(result.name).toBe('João Silva');
      });

      it('deve retornar erro com phone inválido', async () => {
        const contactData = {
          name: 'João Silva',
          phone: 'invalid',
          email: 'joao@email.com',
          company: 'Empresa Teste',
          tenantId: 'tenant-1',
        };

        (Contact.create as jest.Mock).mockRejectedValue(
          new Error('Phone inválido')
        );

        await expect(managementService.contacts.create(contactData)).rejects.toThrow();
      });
    });

    describe('list', () => {
      it('deve listar contatos da empresa', async () => {
        const contacts = [
          { id: 'contact-1', name: 'João', phone: '5566989898989' },
          { id: 'contact-2', name: 'Maria', phone: '5566987654321' },
        ];

        (Contact.findAll as jest.Mock).mockResolvedValue(contacts);

        const result = await managementService.contacts.list({
          tenantId: 'tenant-1',
          limit: 100,
          offset: 0,
        });

        expect(Contact.findAll).toHaveBeenCalled();
        expect(result).toHaveLength(2);
      });

      it('deve respeitar paginação', async () => {
        (Contact.findAll as jest.Mock).mockResolvedValue([]);

        await managementService.contacts.list({
          tenantId: 'tenant-1',
          limit: 50,
          offset: 100,
        });

        expect(Contact.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 50,
            offset: 100,
          })
        );
      });
    });

    describe('update', () => {
      it('deve atualizar contato existente', async () => {
        const updatedContact = {
          id: 'contact-1',
          name: 'João Silva Atualizado',
          email: 'joao.novo@email.com',
          updatedAt: new Date(),
        };

        (Contact.update as jest.Mock).mockResolvedValue([1, updatedContact]);

        const result = await managementService.contacts.update('contact-1', {
          name: 'João Silva Atualizado',
          email: 'joao.novo@email.com',
        });

        expect(Contact.update).toHaveBeenCalled();
      });
    });

    describe('delete', () => {
      it('deve deletar contato', async () => {
        (Contact.destroy as jest.Mock).mockResolvedValue(1);

        const result = await managementService.contacts.delete('contact-1');

        expect(Contact.destroy).toHaveBeenCalledWith({
          where: { id: 'contact-1' },
        });
      });

      it('deve retornar erro ao deletar contato inexistente', async () => {
        (Contact.destroy as jest.Mock).mockResolvedValue(0);

        await expect(
          managementService.contacts.delete('inexistente')
        ).rejects.toThrow();
      });
    });

    describe('search', () => {
      it('deve buscar contatos por nome', async () => {
        const contacts = [
          { id: 'contact-1', name: 'João Silva', phone: '5566989898989' },
        ];

        (Contact.findAll as jest.Mock).mockResolvedValue(contacts);

        const result = await managementService.contacts.search({
          q: 'João',
          tenantId: 'tenant-1',
        });

        expect(Contact.findAll).toHaveBeenCalled();
        expect(result).toHaveLength(1);
      });

      it('deve buscar contatos por email', async () => {
        const contacts = [
          { id: 'contact-1', email: 'joao@email.com' },
        ];

        (Contact.findAll as jest.Mock).mockResolvedValue(contacts);

        const result = await managementService.contacts.search({
          q: 'joao@email.com',
          tenantId: 'tenant-1',
        });

        expect(result).toHaveLength(1);
      });

      it('deve retornar array vazio se não encontrar', async () => {
        (Contact.findAll as jest.Mock).mockResolvedValue([]);

        const result = await managementService.contacts.search({
          q: 'inexistente',
          tenantId: 'tenant-1',
        });

        expect(result).toHaveLength(0);
      });
    });
  });

  describe('company', () => {
    describe('getStats', () => {
      it('deve retornar estatísticas da empresa', async () => {
        const stats = {
          totalContacts: 1500,
          messagesToday: 320,
          activeChats: 45,
          bots: 3,
        };

        (Company.findOne as jest.Mock).mockResolvedValue({
          id: 'company-1',
          contacts: { length: stats.totalContacts },
        });

        const result = await managementService.company.getStats('tenant-1');

        expect(result).toHaveProperty('totalContacts');
      });
    });

    describe('update', () => {
      it('deve atualizar dados da empresa', async () => {
        const updatedCompany = {
          id: 'company-1',
          name: 'Empresa Atualizada',
          phone: '5566999999999',
          website: 'https://empresa.com',
        };

        (Company.update as jest.Mock).mockResolvedValue([1, updatedCompany]);

        await managementService.company.update('company-1', {
          name: 'Empresa Atualizada',
          phone: '5566999999999',
        });

        expect(Company.update).toHaveBeenCalled();
      });
    });
  });
});
