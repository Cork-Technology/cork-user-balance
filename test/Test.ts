import assert from "assert";
import { 
  TestHelpers,
  CorkCT_Approval,
  Withdrawal_WithdrawalClaimed
} from "generated";
const { MockDb, CorkCT, Withdrawal } = TestHelpers;

describe("CorkCT contract Approval event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for CorkCT contract Approval event
  const event = CorkCT.Approval.createMockEvent({/* It mocks event fields with default values. You can overwrite them if you need */});

  it("CorkCT_Approval is created correctly", async () => {
    // Processing the event
    const mockDbUpdated = await CorkCT.Approval.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualCorkCTApproval = mockDbUpdated.entities.CorkCT_Approval.get(
      `${event.chainId}_${event.block.number}_${event.logIndex}`
    );

    // Creating the expected entity
    const expectedCorkCTApproval: CorkCT_Approval = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      srcAddress: event.srcAddress,
      owner: event.params.owner,
      spender: event.params.spender,
      value: event.params.value,
    };
    // Asserting that the entity in the mock database is the same as the expected entity
    assert.deepEqual(actualCorkCTApproval, expectedCorkCTApproval, "Actual CorkCTApproval should be the same as the expectedCorkCTApproval");
  });
});

describe("Withdrawal contract WithdrawalClaimed event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for Withdrawal contract WithdrawalClaimed event
  const event = Withdrawal.WithdrawalClaimed.createMockEvent({/* It mocks event fields with default values. You can overwrite them if you need */});

  it("Withdrawal_WithdrawalClaimed is created correctly", async () => {
    // Processing the event
    const mockDbUpdated = await Withdrawal.WithdrawalClaimed.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualWithdrawalWithdrawalClaimed = mockDbUpdated.entities.Withdrawal_WithdrawalClaimed.get(
      `${event.chainId}_${event.block.number}_${event.logIndex}`
    );

    // Creating the expected entity
    const expectedWithdrawalWithdrawalClaimed: Withdrawal_WithdrawalClaimed = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      withdrawalId: event.params.withdrawalId,
      owner: event.params.owner,
    };
    // Asserting that the entity in the mock database is the same as the expected entity
    assert.deepEqual(actualWithdrawalWithdrawalClaimed, expectedWithdrawalWithdrawalClaimed, "Actual WithdrawalWithdrawalClaimed should be the same as the expectedWithdrawalWithdrawalClaimed");
  });
});
